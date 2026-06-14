const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_EMAIL    = 'admin@jeevarsi.org';
const ADMIN_PASSWORD = 'Jeevarsi@2025';
const STORE_PREFIX   = 'jeevarasi-gallery/';
const BUCKET         = 'gallery';

const DB_TABLES = {
  stats:       'jeevarasi_stats',
  events:      'jeevarasi_events',
  projects:    'jeevarasi_projects',
  fundraising: 'jeevarasi_fundraising'
};
const DB_ORDER = {
  stats:       'sort_order.asc,created_at.asc',
  events:      'event_date.asc',
  projects:    'sort_order.asc,created_at.desc',
  fundraising: 'created_at.desc'
};

// In-memory session tokens (cleared on server restart)
const tokens = new Set();

// ── SUPABASE CONFIG ───────────────────────────────────────────
function sbUrl() {
  const u = process.env.SUPABASE_URL || '';
  // Strip /rest/v1 or /storage/v1 suffix if user included it
  return u.replace(/\/(rest|storage)\/v1\/?.*$/, '').replace(/\/$/, '');
}
function sbAnon()    { return process.env.SUPABASE_ANON    || ''; }
function sbService() { return process.env.SUPABASE_SERVICE || ''; }
function encodePath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

// ── AUTH ──────────────────────────────────────────────────────
function isAuthed(req) {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  return tokens.has(auth);
}

// ── SUPABASE DB HELPER ────────────────────────────────────────
async function dbFetch(table, method, body, qs) {
  const url = `${sbUrl()}/rest/v1/${table}${qs ? '?' + qs : ''}`;
  const headers = { apikey: sbAnon(), 'content-type': 'application/json' };
  if (method !== 'GET') {
    headers.authorization = `Bearer ${sbService()}`;
    headers.prefer = 'return=representation';
  }
  const opts = { method, headers };
  if (body !== null && body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (r.status === 204) return null;
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status}: ${t}`); }
  return r.json();
}

// ── STATIC FILES ──────────────────────────────────────────────
app.use(express.static(__dirname));

// ── POST /api/admin ───────────────────────────────────────────
app.post('/api/admin', express.json({ limit: '55mb' }), async (req, res) => {
  const action = req.query.action;

  // Login — no auth required
  if (action === 'login') {
    const { email, password } = req.body || {};
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD)
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = crypto.randomBytes(32).toString('hex');
    tokens.add(token);
    return res.json({ token });
  }

  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  // Upload to Supabase Storage
  if (action === 'upload') {
    try {
      const { filename, type, data } = req.body || {};
      if (!filename || !data) return res.status(400).json({ error: 'Missing file data' });
      const buf  = Buffer.from(data, 'base64');
      const fp   = `${STORE_PREFIX}${Date.now()}-${path.basename(filename)}`;
      const r = await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}/${encodePath(fp)}`, {
        method:  'POST',
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': type || 'application/octet-stream' },
        body:    buf
      });
      if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: t }); }
      return res.json({ url: `${sbUrl()}/storage/v1/object/public/${BUCKET}/${encodePath(fp)}` });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // DB create (stats / events / projects / fundraising)
  if (DB_TABLES[action]) {
    try   { return res.json(await dbFetch(DB_TABLES[action], 'POST', req.body, null)); }
    catch (e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(400).json({ error: 'Invalid action' });
});

// ── GET /api/admin ────────────────────────────────────────────
app.get('/api/admin', async (req, res) => {
  const action = req.query.action;

  // Gallery list from Supabase Storage
  if (action === 'gallery') {
    try {
      const r = await fetch(`${sbUrl()}/storage/v1/object/list/${BUCKET}`, {
        method:  'POST',
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' },
        body:    JSON.stringify({ prefix: STORE_PREFIX, limit: 100, offset: 0 })
      });
      if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: t }); }
      const items = (await r.json() || [])
        .filter(i => i && i.id && i.name !== '.emptyFolderPlaceholder')
        .map(i => {
          const full = `${STORE_PREFIX}${i.name}`;
          const ext  = path.extname(i.name).toLowerCase();
          return {
            url:         `${sbUrl()}/storage/v1/object/public/${BUCKET}/${encodePath(full)}`,
            pathname:    full,
            uploadedAt:  i.created_at || new Date().toISOString(),
            contentType: ext === '.mp4' ? 'video/mp4' : ext === '.png' ? 'image/png' : 'image/jpeg'
          };
        }).reverse();
      return res.json(items);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // DB read
  if (DB_TABLES[action]) {
    const id = req.query.id;
    try {
      const qs = id ? `id=eq.${encodeURIComponent(id)}` : `order=${DB_ORDER[action]}`;
      return res.json(await dbFetch(DB_TABLES[action], 'GET', null, qs) || []);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(400).json({ error: 'Invalid action' });
});

// ── PATCH /api/admin ──────────────────────────────────────────
app.patch('/api/admin', express.json(), async (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  const action = req.query.action;
  const id     = req.query.id;
  if (!DB_TABLES[action]) return res.status(400).json({ error: 'Invalid action' });
  if (!id)                 return res.status(400).json({ error: 'Missing id' });
  try {
    const body = { ...req.body, updated_at: new Date().toISOString() };
    return res.json(await dbFetch(DB_TABLES[action], 'PATCH', body, `id=eq.${encodeURIComponent(id)}`) || { success: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/admin ─────────────────────────────────────────
app.delete('/api/admin', express.json(), async (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  const action = req.query.action;
  const id     = req.query.id;

  // Delete media from Supabase Storage
  if (action === 'delete') {
    try {
      const { url } = req.body || {};
      if (!url) return res.status(400).json({ error: 'No URL provided' });
      const marker = `/object/public/${BUCKET}/`;
      const idx    = url.indexOf(marker);
      if (idx === -1) return res.status(400).json({ error: 'Invalid URL' });
      const fp = decodeURIComponent(url.slice(idx + marker.length));
      const r = await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}`, {
        method:  'DELETE',
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' },
        body:    JSON.stringify({ prefixes: [fp] })
      });
      if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: t }); }
      return res.json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // DB delete
  if (DB_TABLES[action]) {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      await dbFetch(DB_TABLES[action], 'DELETE', null, `id=eq.${encodeURIComponent(id)}`);
      return res.json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(400).json({ error: 'Invalid action' });
});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Server : http://localhost:${PORT}`);
  console.log(`  Admin  : http://localhost:${PORT}/admin.html`);
  console.log(`  Login  : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Supa   : ${sbUrl() || '⚠️  SUPABASE_URL not set'}\n`);
});
