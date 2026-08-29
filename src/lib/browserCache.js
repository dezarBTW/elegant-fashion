const CACHE_PREFIX = "elegant-style:";

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads a JSON value saved on this device. Expired or malformed entries are
 * discarded so callers can safely fall back to their data source.
 */
export function getCachedValue(key) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const cached = JSON.parse(storage.getItem(`${CACHE_PREFIX}${key}`));
    if (!cached || cached.expiresAt <= Date.now()) {
      storage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return cached.value;
  } catch {
    storage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

export function setCachedValue(key, value, ttlMs) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ value, expiresAt: Date.now() + ttlMs })
    );
  } catch {
    // Storage can be unavailable or full; fetching data must still work.
  }
}

export function invalidateCachedValue(key) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // Ignore storage failures; a short expiry protects against stale data.
  }
}
