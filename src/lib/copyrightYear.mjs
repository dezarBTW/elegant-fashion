export function watchCopyrightYear(onYearChange) {
  let timer;

  function updateCopyrightYear() {
    clearTimeout(timer);
    const now = new Date();
    onYearChange(now.getFullYear());
    const nextNewYear = new Date(now.getFullYear() + 1, 0, 1);
    // Recheck daily to stay below the browser's maximum timer delay.
    timer = setTimeout(updateCopyrightYear, Math.min(nextNewYear - now, 24 * 60 * 60 * 1000));
  }

  function refreshWhenVisible() {
    if (document.visibilityState === "visible") updateCopyrightYear();
  }

  updateCopyrightYear();
  window.addEventListener("focus", updateCopyrightYear);
  document.addEventListener("visibilitychange", refreshWhenVisible);

  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", updateCopyrightYear);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  };
}
