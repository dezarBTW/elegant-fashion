const MESSAGE = 'Unable to check availability. Please try again.';

// One browser-wide subscription, timer and in-flight job per product, even when
// product details, checkout and the cart observe overlapping sets of products.
export function createPurchaseLimitStore({ fetchLimits, isVisible = () => true, listen = () => () => {}, now = Date.now, setTimer = setInterval, clearTimer = clearInterval }) {
  const entries = new Map(), jobs = new Map(), listeners = new Map();
  let queued = false, timer, stopListening;
  const snapshot = keys => ({
    loaded: keys.every(id => entries.get(id)?.loaded),
    limits: Object.fromEntries(keys.map(id => [id, entries.get(id)?.limits || {}])),
    error: keys.some(id => entries.get(id)?.error) ? MESSAGE : '',
  });
  const notify = () => { for (const [callback, keys] of listeners) callback(snapshot(keys)); };
  const flush = async () => {
    queued = false;
    const waiting = [...jobs].filter(([, job]) => !job.started);
    waiting.forEach(([, job]) => { job.started = true; });
    const batches = [];
    for (let i = 0; i < waiting.length; i += 50) batches.push(waiting.slice(i, i + 50));
    await Promise.all(batches.map(async batch => {
      try {
        const limits = await fetchLimits(batch.map(([id]) => id));
        for (const [id, job] of batch) {
          const value = limits[id] || {};
          entries.set(id, { loaded: true, limits: value, error: '', checkedAt: now() });
          jobs.delete(id); job.resolve(value);
        }
      } catch {
        for (const [id, job] of batch) {
          entries.set(id, { loaded: true, limits: {}, error: MESSAGE, checkedAt: now() });
          jobs.delete(id); job.reject(new Error(MESSAGE));
        }
      }
      notify();
    }));
  };
  const refresh = async keys => {
    const values = await Promise.all(keys.map(id => {
      if (!jobs.has(id)) {
        const job = { started: false };
        job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
        jobs.set(id, job);
      }
      return jobs.get(id).promise;
    }));
    return Object.fromEntries(keys.map((id, index) => [id, values[index]]));
  };
  const request = keys => {
    const result = refresh([...new Set(keys)]);
    if (!queued && [...jobs.values()].some(job => !job.started)) { queued = true; queueMicrotask(flush); }
    return result;
  };
  const passiveRefresh = () => {
    if (!isVisible()) return;
    const keys = [...new Set([...listeners.values()].flat())].filter(id => !entries.get(id)?.loaded || now() - entries.get(id).checkedAt >= 1000);
    request(keys).catch(() => {});
  };
  return {
    refresh: request,
    subscribe(keys, callback) {
      callback(snapshot(keys));
      if (!keys.length) return () => {};
      listeners.set(callback, keys);
      if (listeners.size === 1) { timer = setTimer(passiveRefresh, 15000); stopListening = listen(passiveRefresh); }
      passiveRefresh();
      return () => {
        listeners.delete(callback);
        if (!listeners.size) { clearTimer(timer); stopListening?.(); }
      };
    },
  };
}
