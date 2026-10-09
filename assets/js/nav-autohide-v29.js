/* v29: compact bottom navigation with gentle auto-hide and recovery gestures. */
(() => {
  'use strict';
  const init = () => {
    const nav = document.querySelector('nav.bottom[aria-label="Main navigation"]');
    const scroller = document.getElementById('scroll');
    if (!nav || !scroller) return;

    // Mobile navigation must remain available in the installed PWA. Auto-hiding
    // the fixed bar can make it appear that the viewport has collapsed or that
    // the page is not truly fullscreen, and can leave touch users without nav.
    if (window.matchMedia('(max-width: 760px)').matches) {
      nav.classList.remove('nav-auto-hidden');
      nav.setAttribute('aria-hidden', 'false');
      nav.inert = false;
      nav.style.removeProperty('transform');
      nav.style.removeProperty('opacity');
      nav.style.removeProperty('pointer-events');
      return;
    }

    let hideTimer = 0;
    let lastScrollTop = scroller.scrollTop;
    let lastScrollAt = 0;
    const HIDE_AFTER = 4800;

    const isDialogOpen = () => Boolean(document.querySelector('dialog[open]'));
    const show = (reset = true) => {
      nav.classList.remove('nav-auto-hidden');
      nav.setAttribute('aria-hidden', 'false');
      nav.inert = false;
      if (reset) scheduleHide();
    };
    const hide = () => {
      if (isDialogOpen()) return;
      nav.classList.add('nav-auto-hidden');
      nav.setAttribute('aria-hidden', 'true');
      nav.inert = true;
    };
    function scheduleHide() {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, HIDE_AFTER);
    }

    nav.addEventListener('click', () => show(true));
    scroller.addEventListener('scroll', () => {
      const now = Date.now();
      const current = scroller.scrollTop;
      const delta = current - lastScrollTop;
      if (Math.abs(delta) > 5 && now - lastScrollAt > 80) {
        if (delta > 0 && current > 70) {
          window.clearTimeout(hideTimer);
          hideTimer = window.setTimeout(hide, 450);
        } else if (delta < 0) {
          show(true);
        }
        lastScrollAt = now;
      }
      lastScrollTop = current;
    }, { passive: true });

    // Any intentional touch on content brings navigation back; it hides again after inactivity.
    scroller.addEventListener('touchstart', () => show(true), { passive: true });
    scroller.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') show(true);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) show(true);
      else window.clearTimeout(hideTimer);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') show(true);
    });

    nav.classList.remove('nav-auto-hidden');
    nav.setAttribute('aria-hidden', 'false');
    scheduleHide();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
