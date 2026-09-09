/* =============================================
   JEEVARSI TRUST — ANIMATED COUNTER
   Triggers when element scrolls into view
   ============================================= */

(function () {
  'use strict';

  function animateCounter(el, target, duration, suffix) {
    const start = 0;
    const startTime = performance.now();
    const isFloat = target % 1 !== 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = isFloat
        ? (start + (target - start) * eased).toFixed(1)
        : Math.round(start + (target - start) * eased);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(update);
      else {
        el.textContent = target + suffix;
        el.classList.add('count-done');
      }
    }
    requestAnimationFrame(update);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseFloat(el.getAttribute('data-count'));
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = parseInt(el.getAttribute('data-duration') || '2000');
            animateCounter(el, target, duration, suffix);
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.5 });

      counters.forEach(function (counter) { observer.observe(counter); });
    } else {
      // Fallback: set final value immediately
      counters.forEach(function (counter) {
        const target = counter.getAttribute('data-count');
        const suffix = counter.getAttribute('data-suffix') || '';
        counter.textContent = target + suffix;
      });
    }
  }

  window.initCounters = initCounters;
  // stats-loader.js calls initCounters after updating data-count from Supabase

})();
