(function () {
  'use strict';

  const STORAGE_KEY = 'admin_token';
  let authToken = null;

  // ── AUTH HELPERS ───────────────────────────────────────────
  function getToken() { return sessionStorage.getItem(STORAGE_KEY); }
  function setToken(token) { sessionStorage.setItem(STORAGE_KEY, token); authToken = token; }
  function clearToken() { sessionStorage.removeItem(STORAGE_KEY); authToken = null; }

  function showLoginScreen() {
    document.getElementById('admin-login').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
  }

  function showAdminPanel() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    initTabs();
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';

    try {
      const response = await fetch('/api/admin?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        errorEl.textContent = data.error || 'Invalid password';
        errorEl.style.display = 'block';
        return;
      }
      const data = await response.json();
      setToken(data.token);
      document.getElementById('login-form').reset();
      showAdminPanel();
    } catch {
      errorEl.textContent = 'Login failed. Try again.';
      errorEl.style.display = 'block';
    }
  }

  // ── API HELPER ─────────────────────────────────────────────
  async function apiRequest(method, action, id, body) {
    const url = '/api/admin?action=' + action + (id ? '&id=' + encodeURIComponent(id) : '');
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    return r.json();
  }

  // ── TOAST ──────────────────────────────────────────────────
  function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'success');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── MODAL ──────────────────────────────────────────────────
  let _modalSubmitHandler = null;

  function showModal(title, fieldsHtml, onSubmit) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-fields').innerHTML = fieldsHtml;
    document.getElementById('admin-modal').style.display = 'flex';

    const form = document.getElementById('modal-form');
    if (_modalSubmitHandler) form.removeEventListener('submit', _modalSubmitHandler);
    _modalSubmitHandler = function (e) {
      e.preventDefault();
      onSubmit(e);
    };
    form.addEventListener('submit', _modalSubmitHandler);
  }

  function closeModal() {
    document.getElementById('admin-modal').style.display = 'none';
    const form = document.getElementById('modal-form');
    if (_modalSubmitHandler) { form.removeEventListener('submit', _modalSubmitHandler); _modalSubmitHandler = null; }
    form.reset();
    document.getElementById('modal-fields').innerHTML = '';
    document.querySelector('#admin-modal .modal-box').classList.remove('modal-wide');
    _blogQuill = null;
  }

  function getField(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  // ── TABS ───────────────────────────────────────────────────
  const tabLoaded = {};

  function switchTab(name) {
    document.querySelectorAll('.admin-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + name);
    });
    if (!tabLoaded[name]) {
      tabLoaded[name] = true;
      var loaders = {
        media: loadMediaGallery,
        stats: loadStats,
        events: loadEvents,
        projects: loadProjects,
        fundraising: loadFundraising,
        blog: loadBlogs,
        registrations: loadRegistrations,
        contacts: loadContacts,
        reviews: loadReviews,
        newsletter: loadNewsletter
      };
      if (loaders[name]) loaders[name]();
    }
  }

  function initTabs() {
    document.querySelectorAll('.admin-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });
    switchTab('media');
  }

  // ── MEDIA GALLERY ──────────────────────────────────────────
  async function loadMediaGallery() {
    try {
      const response = await fetch('/api/admin?action=gallery');
      if (!response.ok) throw new Error('Failed to load gallery');
      const items = await response.json();
      const grid = document.getElementById('admin-media-grid');

      if (!items || items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No media yet. Upload some!</p>';
        return;
      }

      grid.innerHTML = items.map(function (item) {
        const isVideo = item.contentType && item.contentType.startsWith('video/');
        return '<div class="admin-media-item">' +
          (isVideo
            ? '<video src="' + item.url + '" style="width:100%;height:100%;object-fit:cover;"></video>'
            : '<img src="' + item.url + '" alt="Media">') +
          '<span class="admin-media-tag">' + (isVideo ? 'Video' : 'Photo') + '</span>' +
          '<div class="admin-media-overlay"><div class="admin-media-actions">' +
          '<button class="btn btn-danger delete-media-btn" data-url="' + item.url + '">' +
          '<i class="fas fa-trash"></i> Delete</button>' +
          '</div></div></div>';
      }).join('');

      document.querySelectorAll('.delete-media-btn').forEach(function (btn) {
        btn.addEventListener('click', async function (e) {
          e.preventDefault();
          if (!confirm('Delete this media?')) return;
          await deleteMedia(btn.getAttribute('data-url'));
        });
      });
    } catch (err) {
      console.error('Error loading gallery:', err);
    }
  }

  async function deleteMedia(url) {
    try {
      const response = await fetch('/api/admin?action=delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ url })
      });
      if (!response.ok) throw new Error('Delete failed');
      tabLoaded.media = false;
      loadMediaGallery();
      tabLoaded.media = true;
      showToast('Media deleted');
    } catch {
      showToast('Failed to delete media', 'error');
    }
  }

  async function uploadFiles(files) {
    const dropZone = document.getElementById('admin-drop-zone');
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (!files.length) return;

    const validFiles = [];
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) { alert('"' + file.name + '" exceeds 50MB limit'); continue; }
      if (!['image/jpeg', 'image/png', 'video/mp4'].includes(file.type)) { alert('"' + file.name + '" format not supported'); continue; }
      validFiles.push(file);
    }
    if (!validFiles.length) return;

    uploadProgress.style.display = 'block';
    dropZone.style.pointerEvents = 'none';
    dropZone.style.opacity = '0.5';

    try {
      let completed = 0;
      for (const file of validFiles) {
        const base64 = await new Promise(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function () { resolve(reader.result.split(',')[1]); };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch('/api/admin?action=upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, type: file.type, data: base64 })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Upload failed');
        }
        completed++;
        progressFill.style.width = ((completed / validFiles.length) * 100) + '%';
        progressText.textContent = 'Uploading... ' + completed + '/' + validFiles.length;
      }

      progressText.textContent = '✓ Upload complete!';
      setTimeout(function () {
        uploadProgress.style.display = 'none';
        dropZone.style.pointerEvents = 'auto';
        dropZone.style.opacity = '1';
        progressFill.style.width = '0%';
        document.getElementById('admin-file-input').value = '';
        tabLoaded.media = false;
        loadMediaGallery();
        tabLoaded.media = true;
      }, 1500);
    } catch (err) {
      progressText.textContent = '✗ ' + (err.message || 'Upload failed. Try again.');
      setTimeout(function () {
        uploadProgress.style.display = 'none';
        dropZone.style.pointerEvents = 'auto';
        dropZone.style.opacity = '1';
      }, 2000);
    }
  }

  // ── STATS ──────────────────────────────────────────────────
  async function loadStats() {
    const list = document.getElementById('stats-list');
    try {
      const data = await apiRequest('GET', 'stats');
      if (!data || !data.length) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No stats found.</p></div>';
        return;
      }
      list.innerHTML = data.map(function (s) {
        return '<div class="stat-edit-row" data-id="' + s.id + '">' +
          '<div class="stat-edit-icon"><i class="' + (s.icon_class || 'fas fa-chart-bar') + '"></i></div>' +
          '<div class="stat-edit-fields">' +
          '<input class="stat-input-label" type="text" value="' + esc(s.label) + '" placeholder="Label">' +
          '<input class="stat-input-value" type="number" value="' + s.value + '" placeholder="Value">' +
          '<input class="stat-input-suffix" type="text" value="' + esc(s.suffix) + '" placeholder="Suffix (e.g. +)">' +
          '</div>' +
          '<button class="btn btn-success btn-sm save-stat-btn" data-id="' + s.id + '">' +
          '<i class="fas fa-save"></i> Save</button>' +
          '</div>';
      }).join('');

      bindStatsEvents();
    } catch {
      list.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load stats.</p>';
    }
  }

  function bindStatsEvents() {
    document.getElementById('stats-list').addEventListener('click', async function (e) {
      const btn = e.target.closest('.save-stat-btn');
      if (!btn) return;
      const row = btn.closest('.stat-edit-row');
      const id = row.dataset.id;
      const label = row.querySelector('.stat-input-label').value.trim();
      const value = parseInt(row.querySelector('.stat-input-value').value, 10);
      const suffix = row.querySelector('.stat-input-suffix').value.trim();
      if (!label || isNaN(value)) { showToast('Label and value are required', 'error'); return; }
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      try {
        await apiRequest('PATCH', 'stats', id, { label, value, suffix });
        showToast('Stat saved!');
        btn.innerHTML = '<i class="fas fa-check"></i> Saved';
        setTimeout(function () { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save'; }, 2000);
      } catch {
        showToast('Failed to save stat', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save';
      }
    });
  }

  // ── EVENTS ─────────────────────────────────────────────────
  var _eventsCache = [];

  async function loadEvents() {
    const container = document.getElementById('events-list');
    try {
      _eventsCache = await apiRequest('GET', 'events') || [];
      renderEventsTable(_eventsCache);
    } catch {
      container.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load events.</p>';
    }
  }

  function renderEventsTable(arr) {
    const container = document.getElementById('events-list');
    if (!arr.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No events yet. Add your first event!</p></div>';
      bindEventsEvents();
      return;
    }
    container.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>Title</th><th>Date</th><th>Location</th><th>Category</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      arr.map(function (ev) {
        var dateStr = ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        return '<tr data-id="' + ev.id + '">' +
          '<td><strong>' + esc(ev.title) + '</strong></td>' +
          '<td>' + dateStr + '</td>' +
          '<td>' + esc(ev.location || '—') + '</td>' +
          '<td>' + esc(ev.category || '—') + '</td>' +
          '<td><span class="badge badge-' + ev.status + '">' + ev.status + '</span> <span class="badge badge-' + (ev.is_published ? 'published' : 'draft') + '">' + (ev.is_published ? 'Published' : 'Draft') + '</span></td>' +
          '<td class="action-cell">' +
          '<button class="btn btn-sm ' + (ev.is_published ? 'btn-outline' : 'btn-success') + ' publish-event-btn" data-id="' + ev.id + '" data-published="' + (ev.is_published ? 'true' : 'false') + '" title="' + (ev.is_published ? 'Unpublish' : 'Publish') + '"><i class="fas fa-' + (ev.is_published ? 'eye-slash' : 'eye') + '"></i></button>' +
          '<button class="btn btn-sm btn-outline toggle-event-btn" data-id="' + ev.id + '" data-status="' + ev.status + '" title="Toggle open/closed"><i class="fas fa-toggle-' + (ev.status === 'open' ? 'on' : 'off') + '"></i></button>' +
          '<button class="btn btn-sm btn-outline edit-event-btn" data-id="' + ev.id + '" title="Edit"><i class="fas fa-edit"></i></button>' +
          '<button class="btn btn-sm btn-danger delete-event-btn" data-id="' + ev.id + '" title="Delete"><i class="fas fa-trash"></i></button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table>';

    bindEventsEvents();
  }

  function eventFieldsHtml(ev) {
    ev = ev || {};
    return '<div class="form-group"><label>Title *</label><input type="text" id="ev-title" value="' + esc(ev.title || '') + '" required></div>' +
      '<div class="form-group"><label>Description</label><textarea id="ev-description">' + esc(ev.description || '') + '</textarea></div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Event Date</label><input type="date" id="ev-date" value="' + (ev.event_date || '') + '"></div>' +
      '<div class="form-group"><label>Status</label><select id="ev-status"><option value="open"' + (ev.status === 'open' ? ' selected' : '') + '>Open</option><option value="closed"' + (ev.status === 'closed' ? ' selected' : '') + '>Closed</option></select></div>' +
      '</div>' +
      '<div class="form-group"><label>Location</label><input type="text" id="ev-location" value="' + esc(ev.location || '') + '"></div>' +
      '<div class="form-group"><label>Category</label><input type="text" id="ev-category" value="' + esc(ev.category || '') + '" placeholder="e.g. Conservation, Education"></div>' +
      '<div class="form-group"><label>Image URL</label><input type="url" id="ev-image" value="' + esc(ev.image_url || '') + '" placeholder="https://..."></div>' +
      '<div class="form-group"><label>Visibility on Website</label><select id="ev-published"><option value="false"' + (!ev.is_published ? ' selected' : '') + '>Draft — hidden from website</option><option value="true"' + (ev.is_published ? ' selected' : '') + '>Published — visible on website</option></select></div>';
  }

  function bindEventsEvents() {
    var container = document.getElementById('events-list');

    container.addEventListener('click', async function (e) {
      const publishBtn = e.target.closest('.publish-event-btn');
      const toggleBtn = e.target.closest('.toggle-event-btn');
      const editBtn = e.target.closest('.edit-event-btn');
      const deleteBtn = e.target.closest('.delete-event-btn');

      if (publishBtn) {
        const id = publishBtn.dataset.id;
        const current = publishBtn.dataset.published === 'true';
        publishBtn.disabled = true;
        try {
          await apiRequest('PATCH', 'events', id, { is_published: !current });
          showToast(current ? 'Event unpublished' : 'Event published!');
          await loadEvents();
        } catch { showToast('Failed to update', 'error'); publishBtn.disabled = false; }
      }

      if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const current = toggleBtn.dataset.status;
        const next = current === 'open' ? 'closed' : 'open';
        toggleBtn.disabled = true;
        try {
          await apiRequest('PATCH', 'events', id, { status: next });
          showToast('Event ' + next);
          await loadEvents();
        } catch { showToast('Failed to update', 'error'); toggleBtn.disabled = false; }
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const ev = _eventsCache.find(function (x) { return x.id === id; });
        if (!ev) return;
        showModal('Edit Event', eventFieldsHtml(ev), async function () {
          const title = getField('ev-title');
          if (!title) { showToast('Title is required', 'error'); return; }
          try {
            await apiRequest('PATCH', 'events', id, {
              title, description: getField('ev-description'),
              event_date: getField('ev-date') || null, location: getField('ev-location'),
              category: getField('ev-category'), image_url: getField('ev-image'),
              status: document.getElementById('ev-status').value,
              is_published: document.getElementById('ev-published').value === 'true'
            });
            closeModal(); showToast('Event updated!'); await loadEvents();
          } catch { showToast('Failed to update event', 'error'); }
        });
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm('Delete this event?')) return;
        try {
          await apiRequest('DELETE', 'events', id);
          showToast('Event deleted'); await loadEvents();
        } catch { showToast('Failed to delete', 'error'); }
      }
    }, { once: false });

    document.getElementById('add-event-btn').onclick = function () {
      showModal('Add Event', eventFieldsHtml(), async function () {
        const title = getField('ev-title');
        if (!title) { showToast('Title is required', 'error'); return; }
        try {
          await apiRequest('POST', 'events', null, {
            title, description: getField('ev-description'),
            event_date: getField('ev-date') || null, location: getField('ev-location'),
            category: getField('ev-category'), image_url: getField('ev-image'),
            status: document.getElementById('ev-status').value,
            is_published: document.getElementById('ev-published').value === 'true'
          });
          closeModal(); showToast('Event added!'); await loadEvents();
        } catch { showToast('Failed to add event', 'error'); }
      });
    };
  }

  // ── PROJECTS ───────────────────────────────────────────────
  var _projectsCache = [];

  async function loadProjects() {
    try {
      _projectsCache = await apiRequest('GET', 'projects') || [];
      renderProjectsTable(_projectsCache);
    } catch {
      document.getElementById('projects-list').innerHTML =
        '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load projects.</p>';
    }
  }

  function renderProjectsTable(arr) {
    const container = document.getElementById('projects-list');
    if (!arr.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-project-diagram"></i><p>No projects yet. Add your first project!</p></div>';
      bindProjectsEvents();
      return;
    }
    container.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>Title</th><th>Year</th><th>Status</th><th>Sort</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      arr.map(function (p) {
        return '<tr data-id="' + p.id + '">' +
          '<td><strong>' + esc(p.title) + '</strong>' + (p.description ? '<br><small style="color:#666;">' + esc(p.description.substring(0, 60)) + (p.description.length > 60 ? '…' : '') + '</small>' : '') + '</td>' +
          '<td>' + esc(p.year || '—') + '</td>' +
          '<td><span class="badge badge-' + p.status + '">' + p.status + '</span> <span class="badge badge-' + (p.is_published ? 'published' : 'draft') + '">' + (p.is_published ? 'Published' : 'Draft') + '</span></td>' +
          '<td>' + (p.sort_order || 0) + '</td>' +
          '<td class="action-cell">' +
          '<button class="btn btn-sm ' + (p.is_published ? 'btn-outline' : 'btn-success') + ' publish-project-btn" data-id="' + p.id + '" data-published="' + (p.is_published ? 'true' : 'false') + '" title="' + (p.is_published ? 'Unpublish' : 'Publish') + '"><i class="fas fa-' + (p.is_published ? 'eye-slash' : 'eye') + '"></i></button>' +
          '<button class="btn btn-sm btn-outline edit-project-btn" data-id="' + p.id + '"><i class="fas fa-edit"></i></button>' +
          '<button class="btn btn-sm btn-danger delete-project-btn" data-id="' + p.id + '"><i class="fas fa-trash"></i></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';

    bindProjectsEvents();
  }

  function projectFieldsHtml(p) {
    p = p || {};
    return '<div class="form-group"><label>Title *</label><input type="text" id="pr-title" value="' + esc(p.title || '') + '" required></div>' +
      '<div class="form-group"><label>Description</label><textarea id="pr-description">' + esc(p.description || '') + '</textarea></div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Status</label><select id="pr-status"><option value="live"' + (p.status === 'live' ? ' selected' : '') + '>Live</option><option value="completed"' + (p.status === 'completed' ? ' selected' : '') + '>Completed</option><option value="future"' + (p.status === 'future' ? ' selected' : '') + '>Future</option></select></div>' +
      '<div class="form-group"><label>Year</label><input type="text" id="pr-year" value="' + esc(p.year || '') + '" placeholder="e.g. 2024"></div>' +
      '</div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Sort Order</label><input type="number" id="pr-sort" value="' + (p.sort_order || 0) + '"></div>' +
      '<div class="form-group"><label>Image URL</label><input type="url" id="pr-image" value="' + esc(p.image_url || '') + '" placeholder="https://..."></div>' +
      '</div>' +
      '<div class="form-group"><label>Visibility on Website</label><select id="pr-published"><option value="false"' + (!p.is_published ? ' selected' : '') + '>Draft — hidden from website</option><option value="true"' + (p.is_published ? ' selected' : '') + '>Published — visible on About page</option></select></div>';
  }

  function bindProjectsEvents() {
    var container = document.getElementById('projects-list');

    container.addEventListener('click', async function (e) {
      const publishBtn = e.target.closest('.publish-project-btn');
      const editBtn = e.target.closest('.edit-project-btn');
      const deleteBtn = e.target.closest('.delete-project-btn');

      if (publishBtn) {
        const id = publishBtn.dataset.id;
        const current = publishBtn.dataset.published === 'true';
        publishBtn.disabled = true;
        try {
          await apiRequest('PATCH', 'projects', id, { is_published: !current });
          showToast(current ? 'Project unpublished' : 'Project published!');
          await loadProjects();
        } catch { showToast('Failed to update', 'error'); publishBtn.disabled = false; }
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const p = _projectsCache.find(function (x) { return x.id === id; });
        if (!p) return;
        showModal('Edit Project', projectFieldsHtml(p), async function () {
          const title = getField('pr-title');
          if (!title) { showToast('Title is required', 'error'); return; }
          try {
            await apiRequest('PATCH', 'projects', id, {
              title, description: getField('pr-description'),
              status: document.getElementById('pr-status').value,
              year: getField('pr-year'), image_url: getField('pr-image'),
              sort_order: parseInt(getField('pr-sort'), 10) || 0,
              is_published: document.getElementById('pr-published').value === 'true'
            });
            closeModal(); showToast('Project updated!'); await loadProjects();
          } catch { showToast('Failed to update project', 'error'); }
        });
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm('Delete this project?')) return;
        try {
          await apiRequest('DELETE', 'projects', id);
          showToast('Project deleted'); await loadProjects();
        } catch { showToast('Failed to delete', 'error'); }
      }
    }, { once: false });

    document.getElementById('add-project-btn').onclick = function () {
      showModal('Add Project', projectFieldsHtml(), async function () {
        const title = getField('pr-title');
        if (!title) { showToast('Title is required', 'error'); return; }
        try {
          await apiRequest('POST', 'projects', null, {
            title, description: getField('pr-description'),
            status: document.getElementById('pr-status').value,
            year: getField('pr-year'), image_url: getField('pr-image'),
            sort_order: parseInt(getField('pr-sort'), 10) || 0,
            is_published: document.getElementById('pr-published').value === 'true'
          });
          closeModal(); showToast('Project added!'); await loadProjects();
        } catch { showToast('Failed to add project', 'error'); }
      });
    };

    document.getElementById('projects-filter').onchange = function () {
      const val = this.value;
      const filtered = val === 'all' ? _projectsCache : _projectsCache.filter(function (p) { return p.status === val; });
      renderProjectsTable(filtered);
    };
  }

  // ── BLOG ───────────────────────────────────────────────────
  var _blogCache = [];
  var _blogQuill = null;
  var BLOG_CATEGORIES = [
    { value: 'pet', label: 'Animal Care' },
    { value: 'nature', label: 'Plant Conservation' },
    { value: 'education', label: 'Education' },
    { value: 'environment', label: 'Environment' },
    { value: 'community', label: 'Community' },
    { value: 'general', label: 'General' }
  ];

  function slugify(str) {
    return String(str || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function uploadFileToServer(file, folder) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const base64 = reader.result.split(',')[1];
          const response = await fetch('/api/admin?action=upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, type: file.type, data: base64, folder: folder })
          });
          if (!response.ok) {
            const err = await response.json().catch(function () { return {}; });
            throw new Error(err.error || 'Upload failed');
          }
          const data = await response.json();
          resolve(data.url);
        } catch (e) { reject(e); }
      };
      reader.onerror = function () { reject(new Error('Failed to read file')); };
      reader.readAsDataURL(file);
    });
  }

  async function loadBlogs() {
    try {
      _blogCache = await apiRequest('GET', 'blogs') || [];
      renderBlogsTable(_blogCache);
    } catch {
      document.getElementById('blog-list').innerHTML =
        '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load blog posts.</p>';
    }
  }

  function renderBlogsTable(arr) {
    const container = document.getElementById('blog-list');
    if (!arr.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-blog"></i><p>No blog posts yet. Add your first post!</p></div>';
      bindBlogEvents();
      return;
    }
    container.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>Title</th><th>Type</th><th>Category</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      arr.map(function (b) {
        const catLabel = (BLOG_CATEGORIES.find(function (c) { return c.value === b.category; }) || {}).label || b.category || '—';
        return '<tr data-id="' + b.id + '">' +
          '<td><strong>' + esc(b.title) + '</strong>' + (b.summary ? '<br><small style="color:#666;">' + esc(b.summary.substring(0, 60)) + (b.summary.length > 60 ? '…' : '') + '</small>' : '') + '</td>' +
          '<td><span class="badge badge-' + b.content_type + '">' + (b.content_type === 'pdf' ? 'PDF' : 'Editor') + '</span></td>' +
          '<td>' + esc(catLabel) + '</td>' +
          '<td><span class="badge badge-' + (b.is_published ? 'published' : 'draft') + '">' + (b.is_published ? 'Published' : 'Draft') + '</span></td>' +
          '<td class="action-cell">' +
          '<button class="btn btn-sm ' + (b.is_published ? 'btn-outline' : 'btn-success') + ' publish-blog-btn" data-id="' + b.id + '" data-published="' + (b.is_published ? 'true' : 'false') + '" title="' + (b.is_published ? 'Unpublish' : 'Publish') + '"><i class="fas fa-' + (b.is_published ? 'eye-slash' : 'eye') + '"></i></button>' +
          '<button class="btn btn-sm btn-outline edit-blog-btn" data-id="' + b.id + '"><i class="fas fa-edit"></i></button>' +
          '<button class="btn btn-sm btn-danger delete-blog-btn" data-id="' + b.id + '"><i class="fas fa-trash"></i></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';

    bindBlogEvents();
  }

  function blogFieldsHtml(b) {
    b = b || {};
    const catOptions = BLOG_CATEGORIES.map(function (c) {
      return '<option value="' + c.value + '"' + (b.category === c.value ? ' selected' : '') + '>' + c.label + '</option>';
    }).join('');
    const type = b.content_type || 'editor';
    return '<div class="form-group"><label>Title *</label><input type="text" id="bl-title" value="' + esc(b.title || '') + '" required></div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Slug</label><input type="text" id="bl-slug" value="' + esc(b.slug || '') + '" placeholder="auto-generated-from-title"></div>' +
      '<div class="form-group"><label>Category</label><select id="bl-category">' + catOptions + '</select></div>' +
      '</div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Author</label><input type="text" id="bl-author" value="' + esc(b.author || '') + '"></div>' +
      '<div class="form-group"><label>Sort Order</label><input type="number" id="bl-sort" value="' + (b.sort_order || 0) + '"></div>' +
      '</div>' +
      '<div class="form-group"><label>Summary</label><textarea id="bl-summary">' + esc(b.summary || '') + '</textarea></div>' +
      '<div class="form-group"><label>Cover Image</label>' +
      '<div class="file-upload-row">' +
      '<button type="button" class="btn btn-outline btn-sm" id="bl-cover-btn"><i class="fas fa-image"></i> Choose Image</button>' +
      '<input type="file" id="bl-cover-input" accept="image/jpeg,image/png,image/webp" style="display:none;">' +
      '<img id="bl-cover-thumb" class="upload-thumb" src="' + esc(b.cover_image_url || '') + '" style="' + (b.cover_image_url ? 'display:block;' : '') + '">' +
      '<span class="upload-filename" id="bl-cover-status">' + (b.cover_image_url ? 'Image selected' : 'No image selected') + '</span>' +
      '</div>' +
      '<input type="hidden" id="bl-cover-url" value="' + esc(b.cover_image_url || '') + '">' +
      '</div>' +
      '<div class="form-group"><label>Content Type</label>' +
      '<div class="content-type-toggle">' +
      '<label><input type="radio" name="bl-type" value="editor"' + (type === 'editor' ? ' checked' : '') + '> Website Editor</label>' +
      '<label><input type="radio" name="bl-type" value="pdf"' + (type === 'pdf' ? ' checked' : '') + '> Upload PDF</label>' +
      '</div></div>' +
      '<div class="form-group" id="bl-editor-wrap" style="' + (type === 'pdf' ? 'display:none;' : '') + '">' +
      '<label>Content</label>' +
      '<div class="quill-editor-wrap"><div id="bl-editor"></div></div>' +
      '</div>' +
      '<div class="form-group" id="bl-pdf-wrap" style="' + (type === 'editor' ? 'display:none;' : '') + '">' +
      '<label>PDF File</label>' +
      '<div class="file-upload-row">' +
      '<button type="button" class="btn btn-outline btn-sm" id="bl-pdf-btn"><i class="fas fa-file-pdf"></i> Choose PDF</button>' +
      '<input type="file" id="bl-pdf-input" accept="application/pdf" style="display:none;">' +
      '<span class="upload-filename" id="bl-pdf-status">' + (b.pdf_url ? 'PDF selected' : 'No PDF selected') + '</span>' +
      '</div>' +
      '<input type="hidden" id="bl-pdf-url" value="' + esc(b.pdf_url || '') + '">' +
      '</div>' +
      '<div class="form-group"><label>Visibility on Website</label><select id="bl-published"><option value="false"' + (!b.is_published ? ' selected' : '') + '>Draft — hidden from website</option><option value="true"' + (b.is_published ? ' selected' : '') + '>Published — visible on Blog page</option></select></div>';
  }

  function initBlogModal(b) {
    document.querySelector('#admin-modal .modal-box').classList.add('modal-wide');

    const titleEl = document.getElementById('bl-title');
    const slugEl = document.getElementById('bl-slug');
    titleEl.addEventListener('blur', function () {
      if (!slugEl.value.trim()) slugEl.value = slugify(titleEl.value);
    });

    const editorWrap = document.getElementById('bl-editor-wrap');
    const pdfWrap = document.getElementById('bl-pdf-wrap');
    document.querySelectorAll('input[name="bl-type"]').forEach(function (r) {
      r.addEventListener('change', function () {
        const isPdf = this.value === 'pdf';
        editorWrap.style.display = isPdf ? 'none' : '';
        pdfWrap.style.display = isPdf ? '' : 'none';
      });
    });

    _blogQuill = new Quill('#bl-editor', {
      theme: 'snow',
      modules: {
        toolbar: {
          container: [
            ['bold', 'italic', 'underline'],
            [{ header: [2, 3, false] }],
            ['link', 'image'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ],
          handlers: {
            image: function () {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/jpeg,image/png,image/webp,image/gif';
              input.onchange = async function () {
                const file = input.files[0];
                if (!file) return;
                try {
                  const url = await uploadFileToServer(file, 'blog');
                  const range = _blogQuill.getSelection(true);
                  _blogQuill.insertEmbed(range.index, 'image', url);
                  _blogQuill.setSelection(range.index + 1);
                } catch { showToast('Image upload failed', 'error'); }
              };
              input.click();
            }
          }
        }
      }
    });
    if (b && b.content_html) _blogQuill.root.innerHTML = b.content_html;

    const coverBtn = document.getElementById('bl-cover-btn');
    const coverInput = document.getElementById('bl-cover-input');
    const coverThumb = document.getElementById('bl-cover-thumb');
    const coverStatus = document.getElementById('bl-cover-status');
    const coverUrlEl = document.getElementById('bl-cover-url');
    coverBtn.addEventListener('click', function () { coverInput.click(); });
    coverInput.addEventListener('change', async function () {
      const file = coverInput.files[0];
      if (!file) return;
      coverStatus.textContent = 'Uploading...';
      try {
        const url = await uploadFileToServer(file, 'blog');
        coverUrlEl.value = url;
        coverThumb.src = url;
        coverThumb.style.display = 'block';
        coverStatus.textContent = 'Image selected';
      } catch { coverStatus.textContent = 'Upload failed'; }
    });

    const pdfBtn = document.getElementById('bl-pdf-btn');
    const pdfInput = document.getElementById('bl-pdf-input');
    const pdfStatus = document.getElementById('bl-pdf-status');
    const pdfUrlEl = document.getElementById('bl-pdf-url');
    pdfBtn.addEventListener('click', function () { pdfInput.click(); });
    pdfInput.addEventListener('change', async function () {
      const file = pdfInput.files[0];
      if (!file) return;
      pdfStatus.textContent = 'Uploading...';
      try {
        const url = await uploadFileToServer(file, 'blog');
        pdfUrlEl.value = url;
        pdfStatus.textContent = file.name;
      } catch { pdfStatus.textContent = 'Upload failed'; }
    });
  }

  function collectBlogPayload() {
    const type = document.querySelector('input[name="bl-type"]:checked').value;
    return {
      title: getField('bl-title'),
      slug: getField('bl-slug') || slugify(getField('bl-title')),
      category: document.getElementById('bl-category').value,
      author: getField('bl-author'),
      summary: getField('bl-summary'),
      content_type: type,
      content_html: type === 'editor' ? _blogQuill.root.innerHTML : null,
      pdf_url: type === 'pdf' ? getField('bl-pdf-url') : null,
      cover_image_url: getField('bl-cover-url'),
      sort_order: parseInt(getField('bl-sort'), 10) || 0,
      is_published: document.getElementById('bl-published').value === 'true'
    };
  }

  function bindBlogEvents() {
    var container = document.getElementById('blog-list');

    container.addEventListener('click', async function (e) {
      const publishBtn = e.target.closest('.publish-blog-btn');
      const editBtn = e.target.closest('.edit-blog-btn');
      const deleteBtn = e.target.closest('.delete-blog-btn');

      if (publishBtn) {
        const id = publishBtn.dataset.id;
        const current = publishBtn.dataset.published === 'true';
        publishBtn.disabled = true;
        try {
          await apiRequest('PATCH', 'blogs', id, { is_published: !current });
          showToast(current ? 'Post unpublished' : 'Post published!');
          await loadBlogs();
        } catch { showToast('Failed to update', 'error'); publishBtn.disabled = false; }
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const b = _blogCache.find(function (x) { return x.id === id; });
        if (!b) return;
        showModal('Edit Post', blogFieldsHtml(b), async function () {
          const title = getField('bl-title');
          if (!title) { showToast('Title is required', 'error'); return; }
          try {
            await apiRequest('PATCH', 'blogs', id, collectBlogPayload());
            closeModal(); showToast('Post updated!'); await loadBlogs();
          } catch { showToast('Failed to update post', 'error'); }
        });
        initBlogModal(b);
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm('Delete this blog post?')) return;
        try {
          await apiRequest('DELETE', 'blogs', id);
          showToast('Post deleted'); await loadBlogs();
        } catch { showToast('Failed to delete', 'error'); }
      }
    }, { once: false });

    document.getElementById('add-blog-btn').onclick = function () {
      showModal('Add Post', blogFieldsHtml(), async function () {
        const title = getField('bl-title');
        if (!title) { showToast('Title is required', 'error'); return; }
        try {
          await apiRequest('POST', 'blogs', null, collectBlogPayload());
          closeModal(); showToast('Post added!'); await loadBlogs();
        } catch { showToast('Failed to add post', 'error'); }
      });
      initBlogModal();
    };
  }

  // ── FUNDRAISING ────────────────────────────────────────────
  var _fundraisingCache = [];

  async function loadFundraising() {
    const container = document.getElementById('fundraising-list');
    try {
      _fundraisingCache = await apiRequest('GET', 'fundraising') || [];
      renderFundraisingCards(_fundraisingCache);
    } catch {
      container.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:32px;grid-column:1/-1;">Failed to load campaigns.</p>';
    }
  }

  function renderFundraisingCards(arr) {
    const container = document.getElementById('fundraising-list');
    if (!arr.length) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-hand-holding-usd"></i><p>No campaigns yet. Create your first fundraising campaign!</p></div>';
      bindFundraisingEvents();
      return;
    }
    container.innerHTML = arr.map(function (c) {
      var pct = c.goal_amount > 0 ? Math.min(Math.round((c.raised_amount / c.goal_amount) * 100), 100) : 0;
      var startStr = c.start_date ? new Date(c.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      var endStr = c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return '<div class="campaign-card" data-id="' + c.id + '">' +
        '<div class="campaign-header"><h4>' + esc(c.title) + '</h4><div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge badge-' + c.status + '">' + c.status + '</span><span class="badge badge-' + (c.is_published ? 'published' : 'draft') + '">' + (c.is_published ? 'Published' : 'Draft') + '</span></div></div>' +
        (c.description ? '<p class="campaign-desc">' + esc(c.description) + '</p>' : '') +
        '<div class="campaign-progress">' +
        '<div class="campaign-amounts"><span>Raised: ₹' + (c.raised_amount || 0).toLocaleString('en-IN') + '</span><span>Goal: ₹' + (c.goal_amount || 0).toLocaleString('en-IN') + '</span></div>' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="progress-pct">' + pct + '% funded</span>' +
        '</div>' +
        ((startStr || endStr) ? '<div class="campaign-dates">' + (startStr ? startStr : '') + (startStr && endStr ? ' — ' : '') + (endStr ? endStr : '') + '</div>' : '') +
        '<div class="campaign-actions">' +
        '<button class="btn btn-sm btn-outline update-raised-btn" data-id="' + c.id + '" data-raised="' + (c.raised_amount || 0) + '"><i class="fas fa-rupee-sign"></i> Update Raised</button>' +
        '<button class="btn btn-sm btn-outline toggle-campaign-btn" data-id="' + c.id + '" data-status="' + c.status + '"><i class="fas fa-toggle-' + (c.status === 'active' ? 'on' : 'off') + '"></i> ' + (c.status === 'active' ? 'Close' : 'Reopen') + '</button>' +
        '<button class="btn btn-sm ' + (c.is_published ? 'btn-outline' : 'btn-success') + ' publish-campaign-btn" data-id="' + c.id + '" data-published="' + (c.is_published ? 'true' : 'false') + '" title="' + (c.is_published ? 'Unpublish' : 'Publish') + '"><i class="fas fa-' + (c.is_published ? 'eye-slash' : 'eye') + '"></i> ' + (c.is_published ? 'Unpublish' : 'Publish') + '</button>' +
        '<button class="btn btn-sm btn-outline edit-campaign-btn" data-id="' + c.id + '"><i class="fas fa-edit"></i> Edit</button>' +
        '<button class="btn btn-sm btn-outline upload-qr-btn" data-id="' + c.id + '" data-qr="' + esc(c.qr_code_url || '') + '" title="Upload QR Code for Donations"><i class="fas fa-qrcode"></i> ' + (c.qr_code_url ? 'Change QR' : 'Upload QR') + '</button>' +
        '<button class="btn btn-sm btn-danger delete-campaign-btn" data-id="' + c.id + '"><i class="fas fa-trash"></i></button>' +
        '</div></div>';
    }).join('');

    bindFundraisingEvents();
  }

  function campaignFieldsHtml(c) {
    c = c || {};
    return '<div class="form-group"><label>Title *</label><input type="text" id="fc-title" value="' + esc(c.title || '') + '" required></div>' +
      '<div class="form-group"><label>Description</label><textarea id="fc-description">' + esc(c.description || '') + '</textarea></div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Goal Amount (₹)</label><input type="number" id="fc-goal" value="' + (c.goal_amount || '') + '" placeholder="100000"></div>' +
      '<div class="form-group"><label>Raised Amount (₹)</label><input type="number" id="fc-raised" value="' + (c.raised_amount || '') + '" placeholder="0"></div>' +
      '</div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Start Date</label><input type="date" id="fc-start" value="' + (c.start_date || '') + '"></div>' +
      '<div class="form-group"><label>End Date</label><input type="date" id="fc-end" value="' + (c.end_date || '') + '"></div>' +
      '</div>' +
      '<div class="form-group"><label>Image URL</label><input type="url" id="fc-image" value="' + esc(c.image_url || '') + '" placeholder="https://..."></div>' +
      '<div class="modal-form-row">' +
      '<div class="form-group"><label>Status</label><select id="fc-status"><option value="active"' + (c.status !== 'closed' ? ' selected' : '') + '>Active</option><option value="closed"' + (c.status === 'closed' ? ' selected' : '') + '>Closed</option></select></div>' +
      '<div class="form-group"><label>Visibility on Website</label><select id="fc-published"><option value="false"' + (!c.is_published ? ' selected' : '') + '>Draft — hidden</option><option value="true"' + (c.is_published ? ' selected' : '') + '>Published — visible</option></select></div>' +
      '</div>';
  }

  function getCampaignFormData() {
    return {
      title: getField('fc-title'),
      description: getField('fc-description'),
      goal_amount: parseInt(document.getElementById('fc-goal').value, 10) || 0,
      raised_amount: parseInt(document.getElementById('fc-raised').value, 10) || 0,
      start_date: getField('fc-start') || null,
      end_date: getField('fc-end') || null,
      image_url: getField('fc-image'),
      status: document.getElementById('fc-status').value,
      is_published: document.getElementById('fc-published').value === 'true'
    };
  }

  function bindFundraisingEvents() {
    var container = document.getElementById('fundraising-list');

    container.addEventListener('click', async function (e) {
      const updateBtn = e.target.closest('.update-raised-btn');
      const toggleBtn = e.target.closest('.toggle-campaign-btn');
      const publishBtn = e.target.closest('.publish-campaign-btn');
      const editBtn = e.target.closest('.edit-campaign-btn');
      const uploadQrBtn = e.target.closest('.upload-qr-btn');
      const deleteBtn = e.target.closest('.delete-campaign-btn');

      if (uploadQrBtn) {
        const id = uploadQrBtn.dataset.id;
        const currentQr = uploadQrBtn.dataset.qr;
        var qrPreview = currentQr
          ? '<div style="margin-bottom:16px;text-align:center;"><img src="' + currentQr + '" alt="Current QR" style="width:120px;height:120px;object-fit:contain;border:1px solid #ddd;border-radius:6px;"><p style="font-size:12px;color:#999;margin-top:6px;">Current QR code</p></div>'
          : '';
        showModal('Upload QR Code for Donations',
          qrPreview +
          '<p style="font-size:13px;color:#666;margin-bottom:16px;">Upload a UPI QR code image. Visitors will scan this to donate to this campaign.</p>' +
          '<div class="form-group"><label>Select QR Code Image</label><input type="file" id="qr-file-input" accept="image/jpeg,image/png" style="padding:8px 0;"></div>' +
          '<p id="qr-upload-status" style="font-size:13px;color:#666;"></p>',
          async function () {
            var fileInput = document.getElementById('qr-file-input');
            var file = fileInput && fileInput.files[0];
            if (!file) { showToast('Select an image file first', 'error'); return; }
            if (file.size > 5 * 1024 * 1024) { showToast('File must be under 5MB', 'error'); return; }
            var statusEl = document.getElementById('qr-upload-status');
            if (statusEl) statusEl.textContent = 'Uploading...';
            try {
              var base64 = await new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload = function () { resolve(reader.result.split(',')[1]); };
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              var upRes = await fetch('/api/admin?action=upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, type: file.type, data: base64 })
              });
              var upData = await upRes.json();
              if (!upRes.ok || !upData.url) throw new Error(upData.error || 'Upload failed');
              await apiRequest('PATCH', 'fundraising', id, { qr_code_url: upData.url });
              closeModal();
              showToast('QR code uploaded!');
              await loadFundraising();
            } catch (err) {
              if (statusEl) statusEl.textContent = '';
              showToast('Upload failed: ' + (err.message || 'unknown error'), 'error');
            }
          });
      }

      if (updateBtn) {
        const id = updateBtn.dataset.id;
        const current = parseInt(updateBtn.dataset.raised, 10) || 0;
        showModal('Update Raised Amount',
          '<div class="form-group"><label>New Raised Amount (₹)</label><input type="number" id="fc-update-raised" value="' + current + '" min="0" required></div>',
          async function () {
            const val = parseInt(document.getElementById('fc-update-raised').value, 10);
            if (isNaN(val) || val < 0) { showToast('Enter a valid amount', 'error'); return; }
            try {
              await apiRequest('PATCH', 'fundraising', id, { raised_amount: val });
              closeModal(); showToast('Raised amount updated!'); await loadFundraising();
            } catch { showToast('Failed to update', 'error'); }
          });
      }

      if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const current = toggleBtn.dataset.status;
        const next = current === 'active' ? 'closed' : 'active';
        toggleBtn.disabled = true;
        try {
          await apiRequest('PATCH', 'fundraising', id, { status: next });
          showToast('Campaign ' + next); await loadFundraising();
        } catch { showToast('Failed to update', 'error'); toggleBtn.disabled = false; }
      }

      if (publishBtn) {
        const id = publishBtn.dataset.id;
        const current = publishBtn.dataset.published === 'true';
        publishBtn.disabled = true;
        try {
          await apiRequest('PATCH', 'fundraising', id, { is_published: !current });
          showToast(current ? 'Campaign unpublished' : 'Campaign published!');
          await loadFundraising();
        } catch { showToast('Failed to update', 'error'); publishBtn.disabled = false; }
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const c = _fundraisingCache.find(function (x) { return x.id === id; });
        if (!c) return;
        showModal('Edit Campaign', campaignFieldsHtml(c), async function () {
          const data = getCampaignFormData();
          if (!data.title) { showToast('Title is required', 'error'); return; }
          try {
            await apiRequest('PATCH', 'fundraising', id, data);
            closeModal(); showToast('Campaign updated!'); await loadFundraising();
          } catch { showToast('Failed to update campaign', 'error'); }
        });
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm('Delete this campaign?')) return;
        try {
          await apiRequest('DELETE', 'fundraising', id);
          showToast('Campaign deleted'); await loadFundraising();
        } catch { showToast('Failed to delete', 'error'); }
      }
    }, { once: false });

    document.getElementById('add-fundraising-btn').onclick = function () {
      showModal('New Campaign', campaignFieldsHtml(), async function () {
        const data = getCampaignFormData();
        if (!data.title) { showToast('Title is required', 'error'); return; }
        try {
          await apiRequest('POST', 'fundraising', null, data);
          closeModal(); showToast('Campaign created!'); await loadFundraising();
        } catch { showToast('Failed to create campaign', 'error'); }
      });
    };
  }

  // ── REGISTRATIONS ─────────────────────────────────────────
  var _registrationsCache = [];
  var _registrationsEventFilter = 'all';

  async function loadRegistrations() {
    var container = document.getElementById('registrations-list');
    var filterSel = document.getElementById('registrations-event-filter');
    try {
      _registrationsCache = await (async function () {
        var url = '/api/admin?action=event_registrations';
        var r = await fetch(url, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() } });
        return r.json();
      })() || [];

      // Populate event filter dropdown
      if (filterSel) {
        var seen = {};
        var options = '<option value="all">All Events</option>';
        _registrationsCache.forEach(function (r) {
          if (r.event_title && !seen[r.event_title]) {
            seen[r.event_title] = true;
            options += '<option value="' + esc(r.event_title) + '">' + esc(r.event_title) + '</option>';
          }
        });
        filterSel.innerHTML = options;
        filterSel.value = _registrationsEventFilter;
      }

      renderRegistrationsTable(_registrationsCache, _registrationsEventFilter);
    } catch {
      container.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load registrations.</p>';
    }
  }

  function renderRegistrationsTable(arr, eventFilter) {
    var container = document.getElementById('registrations-list');
    var filtered = eventFilter && eventFilter !== 'all'
      ? arr.filter(function (r) { return r.event_title === eventFilter; })
      : arr;

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-user-check"></i><p>No registrations yet' + (eventFilter !== 'all' ? ' for this event' : '') + '.</p></div>';
      return;
    }
    container.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>Date</th><th>Event</th><th>Name</th><th>Email</th><th>Phone</th>' +
      '</tr></thead><tbody>' +
      filtered.map(function (r) {
        var dateStr = r.created_at
          ? new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';
        return '<tr>' +
          '<td style="white-space:nowrap;font-size:13px;">' + dateStr + '</td>' +
          '<td><span class="badge badge-open" style="font-size:11px;">' + esc(r.event_title) + '</span></td>' +
          '<td><strong>' + esc(r.name) + '</strong></td>' +
          '<td><a href="mailto:' + esc(r.email) + '" style="color:var(--primary)">' + esc(r.email) + '</a></td>' +
          '<td>' + esc(r.phone || '—') + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table>' +
      '<p style="margin-top:12px;font-size:13px;color:#999;text-align:right;">' + filtered.length + ' registration' + (filtered.length !== 1 ? 's' : '') + (eventFilter !== 'all' ? ' for this event' : ' total') + '</p>';
  }

  function downloadRegistrationsCSV() {
    var filterSel = document.getElementById('registrations-event-filter');
    var eventFilter = filterSel ? filterSel.value : 'all';
    var filtered = eventFilter && eventFilter !== 'all'
      ? _registrationsCache.filter(function (r) { return r.event_title === eventFilter; })
      : _registrationsCache;
    if (!filtered.length) { showToast('No registrations to download', 'error'); return; }
    var headers = ['Date', 'Event', 'Name', 'Email', 'Phone'];
    var rows = filtered.map(function (r) {
      var dateStr = r.created_at
        ? new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      return [dateStr, r.event_title, r.name, r.email, r.phone || '']
        .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; })
        .join(',');
    });
    var csv = '﻿' + headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'jeevarasi-registrations-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded ' + filtered.length + ' registrations');
  }

  // ── CONTACTS ───────────────────────────────────────────────
  var _contactsCache = [];

  async function loadContacts() {
    var container = document.getElementById('contacts-list');
    try {
      _contactsCache = await apiRequest('GET', 'contacts') || [];
      renderContactsTable(_contactsCache);
    } catch {
      container.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load contacts.</p>';
    }
  }

  function renderContactsTable(arr) {
    var container = document.getElementById('contacts-list');
    if (!arr.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope-open-text"></i><p>No contact form submissions yet.</p></div>';
      return;
    }
    container.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Subject</th><th>Message</th>' +
      '</tr></thead><tbody>' +
      arr.map(function (c) {
        var dateStr = c.created_at
          ? new Date(c.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';
        return '<tr>' +
          '<td style="white-space:nowrap;font-size:13px;">' + dateStr + '</td>' +
          '<td><strong>' + esc(c.name) + '</strong></td>' +
          '<td><a href="mailto:' + esc(c.email) + '" style="color:var(--primary)">' + esc(c.email) + '</a></td>' +
          '<td>' + esc(c.phone || '—') + '</td>' +
          '<td><span class="badge badge-open" style="font-size:11px;">' + esc(c.subject) + '</span></td>' +
          '<td style="max-width:300px;font-size:13px;color:#555;">' + esc(c.message).replace(/\n/g, ' ') + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table>';
  }

  function downloadContactsCSV() {
    if (!_contactsCache.length) { showToast('No contacts to download', 'error'); return; }
    var headers = ['Date', 'Name', 'Email', 'Phone', 'Subject', 'Message'];
    var rows = _contactsCache.map(function (c) {
      var dateStr = c.created_at
        ? new Date(c.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      return [dateStr, c.name, c.email, c.phone || '', c.subject, c.message]
        .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; })
        .join(',');
    });
    var csv = '﻿' + headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'jeevarasi-contacts-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded ' + _contactsCache.length + ' contacts');
  }

  // ── REVIEWS ────────────────────────────────────────────────
  var _reviewsCache = [];

  async function loadReviews() {
    var container = document.getElementById('reviews-list');
    try {
      _reviewsCache = await apiRequest('GET', 'reviews') || [];
      renderReviewsTable(_reviewsCache);
    } catch {
      container.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load reviews.</p>';
    }
  }

  function renderReviewsTable(arr) {
    var container = document.getElementById('reviews-list');
    if (!arr.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet.</p></div>';
      return;
    }
    container.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>Date</th><th>Name</th><th>Rating</th><th>Review</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      arr.map(function (r) {
        var dateStr = r.created_at
          ? new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';
        var stars = '';
        for (var i = 1; i <= 5; i++) {
          stars += '<i class="fas fa-star" style="color:' + (i <= r.rating ? '#f39c12' : '#ddd') + ';font-size:13px;"></i>';
        }
        var badge = r.approved
          ? '<span class="badge badge-live" style="font-size:11px;">Approved</span>'
          : '<span class="badge badge-future" style="font-size:11px;background:rgba(255,193,7,0.15);color:#856404;">Pending</span>';
        var approveBtn = r.approved
          ? '<button class="btn btn-sm btn-outline unapprove-review-btn" data-id="' + r.id + '" title="Unapprove"><i class="fas fa-eye-slash"></i></button>'
          : '<button class="btn btn-sm btn-success approve-review-btn" data-id="' + r.id + '" title="Approve"><i class="fas fa-check"></i></button>';
        return '<tr style="' + (r.approved ? '' : 'background:#fffbea;') + '">' +
          '<td style="white-space:nowrap;font-size:13px;">' + dateStr + '</td>' +
          '<td><strong>' + esc(r.name) + '</strong></td>' +
          '<td style="white-space:nowrap;">' + stars + '</td>' +
          '<td style="max-width:320px;font-size:13px;color:#555;">' + esc(r.message) + '</td>' +
          '<td>' + badge + '</td>' +
          '<td style="white-space:nowrap;">' + approveBtn +
          ' <button class="btn btn-sm btn-danger delete-review-btn" data-id="' + r.id + '" title="Delete"><i class="fas fa-trash"></i></button></td>' +
          '</tr>';
      }).join('') + '</tbody></table>';

    var listEl = document.getElementById('reviews-list');

    listEl.addEventListener('click', function (e) {
      var approveBtn = e.target.closest('.approve-review-btn');
      if (approveBtn) {
        apiRequest('PATCH', 'reviews', approveBtn.dataset.id, { approved: true })
          .then(function () { showToast('Review approved'); loadReviews(); })
          .catch(function () { showToast('Failed to approve', 'error'); });
        return;
      }
      var unapproveBtn = e.target.closest('.unapprove-review-btn');
      if (unapproveBtn) {
        apiRequest('PATCH', 'reviews', unapproveBtn.dataset.id, { approved: false })
          .then(function () { showToast('Review unapproved'); loadReviews(); })
          .catch(function () { showToast('Failed to unapprove', 'error'); });
        return;
      }
      var deleteBtn = e.target.closest('.delete-review-btn');
      if (deleteBtn) {
        apiRequest('DELETE', 'reviews', deleteBtn.dataset.id)
          .then(function () { showToast('Review deleted'); loadReviews(); })
          .catch(function () { showToast('Failed to delete', 'error'); });
      }
    });
  }

  // ── NEWSLETTER ─────────────────────────────────────────────
  var _newsletterCache = [];

  async function loadNewsletter() {
    var container = document.getElementById('newsletter-list');
    try {
      _newsletterCache = await apiRequest('GET', 'newsletter') || [];
      renderNewsletterTable(_newsletterCache);
    } catch {
      container.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:32px;">Failed to load subscribers.</p>';
    }
  }

  function renderNewsletterTable(arr) {
    var container = document.getElementById('newsletter-list');
    if (!arr.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-paper-plane"></i><p>No subscribers yet.</p></div>';
      return;
    }
    container.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>#</th><th>Email</th><th>Subscribed On</th>' +
      '</tr></thead><tbody>' +
      arr.map(function (s, i) {
        var dateStr = s.subscribed_at
          ? new Date(s.subscribed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';
        return '<tr>' +
          '<td style="color:#999;font-size:13px;">' + (i + 1) + '</td>' +
          '<td><a href="mailto:' + esc(s.email) + '" style="color:var(--primary)">' + esc(s.email) + '</a></td>' +
          '<td style="font-size:13px;white-space:nowrap;">' + dateStr + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table>' +
      '<p style="margin-top:12px;font-size:13px;color:#999;text-align:right;">' + arr.length + ' subscriber' + (arr.length !== 1 ? 's' : '') + ' total</p>';
  }

  function downloadNewsletterCSV() {
    if (!_newsletterCache.length) { showToast('No subscribers to download', 'error'); return; }
    var headers = ['#', 'Email', 'Subscribed On'];
    var rows = _newsletterCache.map(function (s, i) {
      var dateStr = s.subscribed_at
        ? new Date(s.subscribed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      return [i + 1, s.email, dateStr]
        .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; })
        .join(',');
    });
    var csv = '﻿' + headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'jeevarasi-newsletter-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded ' + _newsletterCache.length + ' subscribers');
  }

  // ── UTILITY ────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── INIT ───────────────────────────────────────────────────
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    // Check if already logged in
    const token = getToken();
    if (token) { authToken = token; showAdminPanel(); }
    else showLoginScreen();

    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', function () {
      clearToken(); showLoginScreen();
    });

    // File upload
    const fileInput = document.getElementById('admin-file-input');
    const dropZone = document.getElementById('admin-drop-zone');
    dropZone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function (e) { uploadFiles(e.target.files); });
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function (e) { e.preventDefault(); dropZone.classList.remove('drag-over'); uploadFiles(e.dataTransfer.files); });

    // Registrations download + filter
    document.getElementById('download-registrations-btn').addEventListener('click', downloadRegistrationsCSV);
    document.getElementById('registrations-event-filter').addEventListener('change', function () {
      _registrationsEventFilter = this.value;
      renderRegistrationsTable(_registrationsCache, _registrationsEventFilter);
    });

    // Contacts download
    document.getElementById('download-contacts-btn').addEventListener('click', downloadContactsCSV);

    // Newsletter download
    document.getElementById('download-newsletter-btn').addEventListener('click', downloadNewsletterCSV);

    // Modal close
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('admin-modal').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  });

})();
