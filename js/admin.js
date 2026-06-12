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
        fundraising: loadFundraising
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
      const deleteBtn = e.target.closest('.delete-campaign-btn');

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
