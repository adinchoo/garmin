/* Fitness AI v25: touch-first horizontal page navigation and activity detail swipes. */
(() => {
  'use strict';
  const PAGE_ORDER = ['home', 'activities', 'trends', 'nutrition', 'coach', 'profile'];
  const MIN_DISTANCE = 68;
  const DIRECTION_RATIO = 1.22;
  const BLOCKED = 'button, a, input, textarea, select, label, canvas, video, audio, [contenteditable="true"], .filterRail, .fuelTabs, .chart, .combinedStreamCanvas, #map, .leaflet-container, .noSwipe';
  let gesture = null;

  function currentPage() {
    return document.querySelector('.view:not([hidden])')?.dataset.view || 'home';
  }

  function animatePage(direction) {
    const view = document.querySelector('.view:not([hidden])');
    if (!view) return;
    view.classList.remove('swipePageEnter');
    view.style.setProperty('--swipe-enter-x', direction < 0 ? '18px' : '-18px');
    void view.offsetWidth;
    view.classList.add('swipePageEnter');
    window.setTimeout(() => view.classList.remove('swipePageEnter'), 300);
  }

  function changePage(direction) {
    const current = PAGE_ORDER.indexOf(currentPage());
    if (current < 0) return;
    const next = current + direction;
    if (next < 0 || next >= PAGE_ORDER.length) return;
    const target = PAGE_ORDER[next];
    const nav = document.querySelector(`[data-go="${target}"]`);
    if (nav) {
      nav.click();
      animatePage(direction);
      if (navigator.vibrate && direction !== 0) {
        try { navigator.vibrate(8); } catch (_) {}
      }
    }
  }

  function start(e, zone) {
    if (!e.touches || e.touches.length !== 1) { gesture = null; return; }
    const target = e.target;
    if (target?.closest(BLOCKED)) { gesture = null; return; }
    const t = e.touches[0];
    gesture = { x: t.clientX, y: t.clientY, zone, target, time: Date.now() };
  }

  function end(e) {
    if (!gesture || !e.changedTouches || e.changedTouches.length !== 1) { gesture = null; return; }
    const g = gesture;
    gesture = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;
    if (Date.now() - g.time > 1000) return;

    const dialog = document.getElementById('activityDialog');
    if (dialog?.open && (g.zone === 'dialog' || dialog.contains(g.target))) {
      const button = document.getElementById(dx < 0 ? 'detailNext' : 'detailPrev');
      if (button && !button.disabled) button.click();
      return;
    }
    if (g.zone === 'page' && !dialog?.open) changePage(dx < 0 ? 1 : -1);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const scroller = document.getElementById('scroll');
    const dialog = document.getElementById('activityDialog');
    if (scroller) {
      scroller.addEventListener('touchstart', e => start(e, 'page'), { passive: true });
      scroller.addEventListener('touchend', end, { passive: true });
      scroller.addEventListener('touchcancel', () => { gesture = null; }, { passive: true });
    }
    if (dialog) {
      dialog.addEventListener('touchstart', e => start(e, 'dialog'), { passive: true });
      dialog.addEventListener('touchend', end, { passive: true });
      dialog.addEventListener('touchcancel', () => { gesture = null; }, { passive: true });
    }
  });
})();