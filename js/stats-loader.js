(function () {
  'use strict';

  var KEY_MAP = {
    'trees planted':              'trees-planted',
    'hectares restored':          'hectares-restored',
    'plastic collected':          'plastic-collected',
    'plastic collected (tonnes)': 'plastic-collected',
    'students reached':           'students-reached',
    'community clean-up drives':  'cleanups',
    'conservation workshops':     'workshops'
  };

  function loadAndInitCounters() {
    fetch('/api/admin?action=stats')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (stats) {
        stats.forEach(function (stat) {
          var key = KEY_MAP[stat.label.toLowerCase().trim()];
          if (!key) return;
          document.querySelectorAll('[data-stat-key="' + key + '"]').forEach(function (el) {
            el.setAttribute('data-count', stat.value);
            el.setAttribute('data-suffix', stat.suffix);
          });
        });
      })
      .catch(function () {})
      .finally(function () {
        if (window.initCounters) window.initCounters();
      });
  }

  if (document.readyState !== 'loading') loadAndInitCounters();
  else document.addEventListener('DOMContentLoaded', loadAndInitCounters);

})();
