(() => {
  "use strict";
  const MIN_VISIBLE_MS = 1150;
  const MAX_VISIBLE_MS = 4200;
  const startedAt = performance.now();
  let dismissed = false;

  function overlay() {
    return document.getElementById("appSplash");
  }

  function setProgress(value, label) {
    const root = overlay();
    if (!root) return;
    const progress = Math.max(0, Math.min(100, Number(value) || 0));
    root.style.setProperty("--splash-progress", `${progress}%`);
    const text = root.querySelector("[data-splash-status]");
    if (text && label) text.textContent = label;
    root.setAttribute("aria-valuenow", String(progress));
  }

  function dismiss(force = false) {
    if (dismissed) return;
    const root = overlay();
    if (!root) return;
    const wait = force ? 0 : Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
    window.setTimeout(() => {
      if (dismissed) return;
      dismissed = true;
      setProgress(100, "Ready");
      root.classList.add("is-complete");
      document.documentElement.classList.add("splash-complete");
      window.setTimeout(() => root.remove(), 720);
    }, wait);
  }

  window.AppSplash = Object.freeze({ setProgress, dismiss });

  document.addEventListener("DOMContentLoaded", () => {
    setProgress(28, "Starting your health companion");
    requestAnimationFrame(() => overlay()?.classList.add("is-running"));
  }, { once: true });

  window.addEventListener("load", () => {
    setProgress(72, "Loading your dashboard");
    if (document.body.classList.contains("dashboard")) {
      window.setTimeout(() => {
        if (!dismissed && document.getElementById("loader")?.hidden) dismiss();
      }, 120);
    } else {
      dismiss();
    }
  }, { once: true });

  window.setTimeout(() => dismiss(true), MAX_VISIBLE_MS);
})();
