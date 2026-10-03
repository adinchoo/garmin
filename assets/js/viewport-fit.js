/* Keep every mobile app screen on the same live viewport height as the full-screen splash. */
(() => {
  const root = document.documentElement;
  let lastHeight = 0;

  const updateViewportHeight = () => {
    const vv = window.visualViewport;
    const height = Math.round((vv && vv.height) || window.innerHeight || root.clientHeight);
    if (!height || Math.abs(height - lastHeight) < 1) return;
    lastHeight = height;
    root.style.setProperty("--app-viewport-height", `${height}px`);
  };

  updateViewportHeight();
  window.addEventListener("resize", updateViewportHeight, { passive: true });
  window.addEventListener("orientationchange", updateViewportHeight, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewportHeight, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateViewportHeight, { once: true });
  }
})();
