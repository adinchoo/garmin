/* Fitness AI v24 microinteractions. Progressive enhancement only. */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const d = document;
  const interactive = 'button, [role="button"], .btn, .icon, .nav, .tabs button, .filterRail button, .periodTabs button, .coachModes button, .textButton';

  function addRipple(button, event) {
    if (reduceMotion || !button || button.disabled || button.closest('[data-no-ripple]')) return;
    const rect = button.getBoundingClientRect();
    const ripple = d.createElement('span');
    ripple.className = 'motion-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    button.querySelectorAll(':scope > .motion-ripple').forEach(node => node.remove());
    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  function initReveal() {
    const targets = '.view:not([hidden]) .panel, .view:not([hidden]) .metricCard, .view:not([hidden]) .healthSignal, .view:not([hidden]) .activity, .view:not([hidden]) .trendKpi, .view:not([hidden]) .nutritionCard, .view:not([hidden]) .coachSignal, .view:not([hidden]) .combinedStreamCard';
    let observer;
    if (!reduceMotion && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }), { root: d.querySelector('#scroll'), threshold: 0.06, rootMargin: '0px 0px -18px 0px' });
    }
    const mark = root => {
      if (!root?.querySelectorAll) return;
      root.querySelectorAll(targets).forEach((el, index) => {
        if (el.dataset.motionSeen) return;
        el.dataset.motionSeen = '1';
        if (reduceMotion || !observer) return;
        el.classList.add('motion-reveal');
        el.style.setProperty('--motion-delay', `${Math.min(index % 5, 4) * 38}ms`);
        observer.observe(el);
      });
    };
    d.documentElement.classList.add('motion-ready');
    mark(d);
    const mutation = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(node => {
          if (node.nodeType === 1) mark(node.closest?.('.view') || node);
        });
        if (record.type === 'attributes' && record.attributeName === 'hidden' && record.target.matches?.('.view')) {
          if (!record.target.hidden) {
            record.target.classList.remove('motion-enter');
            void record.target.offsetWidth;
            record.target.classList.add('motion-enter');
            mark(record.target);
          }
        }
      }
    });
    mutation.observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  d.addEventListener('pointerdown', event => {
    const button = event.target.closest(interactive);
    if (button && event.button === 0) addRipple(button, event);
  }, { passive: true });

  d.addEventListener('click', event => {
    const nav = event.target.closest('[data-go]');
    if (!nav || reduceMotion) return;
    // Existing app navigation remains the source of truth; animate after it switches views.
    requestAnimationFrame(() => {
      const active = d.querySelector(`.view[data-view="${CSS.escape(nav.dataset.go)}"]`);
      if (active && !active.hidden) {
        active.classList.remove('motion-enter');
        void active.offsetWidth;
        active.classList.add('motion-enter');
      }
    });
  }, true);

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', initReveal, { once: true });
  else initReveal();
})();