(function () {
  'use strict';

  // ── EVENTS (index.html) ───────────────────────────────────
  async function loadPublicEvents() {
    var section = document.getElementById('events-public');
    var grid = document.getElementById('public-events-grid');
    if (!grid) return;

    try {
      var res = await fetch('/api/admin?action=events');
      var all = await res.json();
      var items = (all || []).filter(function (e) { return e.is_published; });
      if (!items.length) return;

      section.style.display = '';
      grid.innerHTML = items.map(function (ev, i) {
        var dateStr = ev.event_date
          ? new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        var delay = (i % 3) + 1;
        var thumb = ev.image_url
          ? 'background:url(' + ev.image_url + ') center/cover no-repeat'
          : 'background:var(--bg-light)';
        return '<div class="news-card pub-event-card reveal reveal-delay-' + delay + '">' +
          '<div class="news-thumb" style="' + thumb + '; height:210px; position:relative;">' +
          (dateStr ? '<span class="event-date-badge"><i class="fas fa-calendar-alt"></i> ' + dateStr + '</span>' : '') +
          '</div>' +
          '<div class="news-body" style="padding:24px;">' +
          '<span class="event-status-badge' + (ev.status === 'closed' ? ' closed' : '') + '">' + (ev.status === 'open' ? 'Open' : 'Closed') + '</span>' +
          '<h3>' + esc(ev.title) + '</h3>' +
          (ev.description ? '<p>' + esc(ev.description.substring(0, 120)) + (ev.description.length > 120 ? '…' : '') + '</p>' : '') +
          (ev.location ? '<p style="font-size:13px;color:var(--text-light);margin-top:8px;"><i class="fas fa-map-marker-alt"></i> ' + esc(ev.location) + '</p>' : '') +
          '</div></div>';
      }).join('');

      observeReveal(grid);
    } catch (err) {
      console.error('Events load error:', err);
    }
  }

  // ── PROJECTS (about.html) ─────────────────────────────────
  async function loadPublicProjects() {
    var section = document.getElementById('projects-public');
    var grid = document.getElementById('public-projects-grid');
    if (!grid) return;

    try {
      var res = await fetch('/api/admin?action=projects');
      var all = await res.json();
      var items = (all || []).filter(function (p) { return p.is_published; });
      if (!items.length) return;

      section.style.display = '';
      grid.innerHTML = items.map(function (p, i) {
        var delay = (i % 3) + 1;
        return '<div class="pub-project-card reveal reveal-delay-' + delay + '">' +
          (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.title) + '" style="width:100%;height:200px;object-fit:cover;">' : '') +
          '<div class="pub-project-body">' +
          '<span class="pub-project-status ' + p.status + '">' + p.status + '</span>' +
          (p.year ? '<span style="font-size:12px;color:var(--text-light);float:right;">' + esc(p.year) + '</span>' : '') +
          '<h3>' + esc(p.title) + '</h3>' +
          (p.description ? '<p>' + esc(p.description.substring(0, 140)) + (p.description.length > 140 ? '…' : '') + '</p>' : '') +
          '</div></div>';
      }).join('');

      observeReveal(grid);
    } catch (err) {
      console.error('Projects load error:', err);
    }
  }

  // ── FUNDRAISING (index.html) ──────────────────────────────
  async function loadPublicFundraising() {
    var section = document.getElementById('fundraising-public');
    var grid = document.getElementById('public-fundraising-grid');
    if (!grid) return;

    try {
      var res = await fetch('/api/admin?action=fundraising');
      var all = await res.json();
      var items = (all || []).filter(function (c) { return c.is_published && c.status === 'active'; });
      if (!items.length) return;

      section.style.display = '';
      grid.innerHTML = items.map(function (c, i) {
        var pct = c.goal_amount > 0 ? Math.min(Math.round((c.raised_amount / c.goal_amount) * 100), 100) : 0;
        var delay = (i % 3) + 1;
        return '<div class="pub-campaign-card reveal reveal-delay-' + delay + '">' +
          (c.image_url ? '<img src="' + esc(c.image_url) + '" alt="' + esc(c.title) + '" style="width:calc(100% + 56px);height:180px;object-fit:cover;margin:-28px -28px 12px;border-radius:4px 4px 0 0;">' : '') +
          '<h3>' + esc(c.title) + '</h3>' +
          (c.description ? '<p>' + esc(c.description.substring(0, 120)) + (c.description.length > 120 ? '…' : '') + '</p>' : '') +
          '<div class="pub-campaign-amounts">' +
          '<span>₹' + (c.raised_amount || 0).toLocaleString('en-IN') + ' raised</span>' +
          '<span>Goal: ₹' + (c.goal_amount || 0).toLocaleString('en-IN') + '</span>' +
          '</div>' +
          '<div style="background:#e0e0e0;border-radius:4px;height:8px;overflow:hidden;">' +
          '<div style="background:var(--primary);width:' + pct + '%;height:100%;border-radius:4px;transition:width 1.2s ease;"></div>' +
          '</div>' +
          '<p class="pub-campaign-pct">' + pct + '% funded</p>' +
          '</div>';
      }).join('');

      observeReveal(grid);
    } catch (err) {
      console.error('Fundraising load error:', err);
    }
  }

  // ── REVEAL ANIMATION ─────────────────────────────────────
  function observeReveal(container) {
    if (!('IntersectionObserver' in window)) {
      container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    container.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
  }

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    loadPublicEvents();
    loadPublicProjects();
    loadPublicFundraising();
  });

})();
