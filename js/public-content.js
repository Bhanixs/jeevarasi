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
        var registerBtn = ev.status === 'open'
          ? '<button class="btn btn-primary pub-register-btn" style="margin-top:16px;width:100%;" data-id="' + esc(ev.id) + '" data-title="' + esc(ev.title) + '"><i class="fas fa-user-plus"></i> Register to Join</button>'
          : '<p style="margin-top:16px;font-size:13px;color:var(--text-light);text-align:center;"><i class="fas fa-lock"></i> Registration closed</p>';
        return '<div class="news-card pub-event-card reveal reveal-delay-' + delay + '">' +
          '<div class="news-thumb" style="' + thumb + '; height:210px; position:relative;">' +
          (dateStr ? '<span class="event-date-badge"><i class="fas fa-calendar-alt"></i> ' + dateStr + '</span>' : '') +
          '</div>' +
          '<div class="news-body" style="padding:24px;">' +
          '<span class="event-status-badge' + (ev.status === 'closed' ? ' closed' : '') + '">' + (ev.status === 'open' ? 'Open' : 'Closed') + '</span>' +
          '<h3>' + esc(ev.title) + '</h3>' +
          (ev.description ? '<p>' + esc(ev.description.substring(0, 120)) + (ev.description.length > 120 ? '…' : '') + '</p>' : '') +
          (ev.location ? '<p style="font-size:13px;color:var(--text-light);margin-top:8px;"><i class="fas fa-map-marker-alt"></i> ' + esc(ev.location) + '</p>' : '') +
          registerBtn +
          '</div></div>';
      }).join('');

      grid.querySelectorAll('.pub-register-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openRegisterModal(btn.dataset.id, btn.dataset.title);
        });
      });

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
        var donateBtn = c.qr_code_url
          ? '<button class="btn btn-primary pub-donate-btn" style="margin-top:16px;width:100%;" data-qr="' + esc(c.qr_code_url) + '" data-title="' + esc(c.title) + '"><i class="fas fa-qrcode"></i> Donate Now</button>'
          : '';
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
          donateBtn +
          '</div>';
      }).join('');

      grid.querySelectorAll('.pub-donate-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openDonateModal(btn.dataset.title, btn.dataset.qr);
        });
      });

      observeReveal(grid);
    } catch (err) {
      console.error('Fundraising load error:', err);
    }
  }

  // ── REGISTRATION MODAL ────────────────────────────────────
  function openRegisterModal(eventId, eventTitle) {
    var modal = document.getElementById('register-modal');
    if (!modal) return;
    document.getElementById('reg-event-id').value = eventId || '';
    document.getElementById('reg-event-title').value = eventTitle || '';
    document.getElementById('register-modal-event-name').textContent = eventTitle || '';
    document.getElementById('register-modal-form').reset();
    document.getElementById('register-error').style.display = 'none';
    document.getElementById('register-submit-btn').disabled = false;
    document.getElementById('register-submit-btn').innerHTML = 'Register Now';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeRegisterModal() {
    var modal = document.getElementById('register-modal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
  }

  // ── DONATE MODAL ──────────────────────────────────────────
  function openDonateModal(title, qrUrl) {
    var modal = document.getElementById('donate-modal');
    if (!modal) return;
    document.getElementById('donate-campaign-name').textContent = title || '';
    document.getElementById('donate-qr-img').src = qrUrl || '';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeDonateModal() {
    var modal = document.getElementById('donate-modal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
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

    // Registration modal
    var regModal = document.getElementById('register-modal');
    if (regModal) {
      document.getElementById('register-modal-close').addEventListener('click', closeRegisterModal);
      document.getElementById('register-cancel-btn').addEventListener('click', closeRegisterModal);
      regModal.addEventListener('click', function (e) { if (e.target === regModal) closeRegisterModal(); });

      document.getElementById('register-modal-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        var submitBtn = document.getElementById('register-submit-btn');
        var errorEl = document.getElementById('register-error');
        var name = document.getElementById('reg-name').value.trim();
        var email = document.getElementById('reg-email').value.trim();
        var phone = document.getElementById('reg-phone').value.trim();
        var eventId = document.getElementById('reg-event-id').value;
        var eventTitle = document.getElementById('reg-event-title').value;

        if (!name || !email) {
          errorEl.textContent = 'Name and email are required.';
          errorEl.style.display = 'block';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        errorEl.style.display = 'none';

        try {
          var res = await fetch('/api/admin?action=event_register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId, event_title: eventTitle, name: name, email: email, phone: phone })
          });
          var data = await res.json();
          if (data.success) {
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Registered!';
            submitBtn.style.background = 'var(--primary-dark)';
            setTimeout(function () {
              closeRegisterModal();
              submitBtn.style.background = '';
            }, 1800);
          } else {
            errorEl.textContent = data.error || 'Registration failed. Please try again.';
            errorEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Register Now';
          }
        } catch (err) {
          errorEl.textContent = 'Network error. Please try again.';
          errorEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Register Now';
        }
      });
    }

    // Donate modal
    var donateModal = document.getElementById('donate-modal');
    if (donateModal) {
      document.getElementById('donate-modal-close').addEventListener('click', closeDonateModal);
      document.getElementById('donate-close-btn').addEventListener('click', closeDonateModal);
      donateModal.addEventListener('click', function (e) { if (e.target === donateModal) closeDonateModal(); });
    }

    // Escape key closes either modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeRegisterModal(); closeDonateModal(); }
    });
  });

})();
