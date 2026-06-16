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
  fundraising: 'jeevarasi_fundraising',
  contacts:    'jeevarasi_contacts'
};
const DB_ORDER = {
  stats:       'sort_order.asc,created_at.asc',
  events:      'event_date.asc',
  projects:    'sort_order.asc,created_at.desc',
  fundraising: 'created_at.desc',
  contacts:    'created_at.desc'
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

// ── NOTIFICATION HELPERS ──────────────────────────────────────
async function notifyEmail(data) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const to = process.env.NOTIFY_EMAIL || 'info@jeevarsi.org';
  const html = `<h2 style="color:#5a9e2f">New Contact Enquiry — Jeevarasi</h2>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
  <tr><td style="padding:6px 12px;font-weight:700;color:#333">Name</td><td style="padding:6px 12px">${data.name}</td></tr>
  <tr style="background:#f9f9f9"><td style="padding:6px 12px;font-weight:700;color:#333">Email</td><td style="padding:6px 12px"><a href="mailto:${data.email}">${data.email}</a></td></tr>
  ${data.phone ? `<tr><td style="padding:6px 12px;font-weight:700;color:#333">Phone</td><td style="padding:6px 12px"><a href="tel:${data.phone}">${data.phone}</a></td></tr>` : ''}
  <tr style="background:#f9f9f9"><td style="padding:6px 12px;font-weight:700;color:#333">Subject</td><td style="padding:6px 12px">${data.subject}</td></tr>
</table>
<p style="margin-top:16px;font-weight:700;color:#333">Message:</p>
<blockquote style="border-left:3px solid #5a9e2f;padding-left:12px;color:#555;margin:0">${data.message.replace(/\n/g, '<br>')}</blockquote>
<p style="margin-top:20px;font-size:12px;color:#999">Submitted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST via jeevarsi.org</p>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || 'Jeevarasi Website <noreply@jeevarsi.org>',
      to: [to],
      reply_to: data.email,
      subject: `[Jeevarasi] ${data.subject} — ${data.name}`,
      html
    })
  }).catch(() => {});
}

async function notifyWhatsApp(data) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.ADMIN_WHATSAPP_TO;
  if (!sid || !token || !from || !to) return;
  const body = `*New Jeevarasi Enquiry* 🌿\n\n*Name:* ${data.name}\n*Email:* ${data.email}${data.phone ? `\n*Phone:* ${data.phone}` : ''}\n*Subject:* ${data.subject}\n\n*Message:*\n${data.message}`;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString()
  }).catch(() => {});
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

  // Newsletter subscription — public, no auth required
  if (action === 'newsletter') {
    const { email } = req.body || {};
    if (!email || !email.includes('@'))
      return res.status(400).json({ error: 'Valid email required' });
    try {
      await dbFetch('jeevarasi_newsletter', 'POST', { email: email.trim().toLowerCase() }, null);
      return res.json({ success: true });
    } catch (e) {
      if (e.message.includes('23505') || e.message.includes('unique')) return res.json({ success: true });
      return res.status(500).json({ error: e.message });
    }
  }

  // Contact form submission — public, no auth required
  if (action === 'contact') {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !subject || !message)
      return res.status(400).json({ error: 'Missing required fields' });
    const record = { name: name.trim(), email: email.trim().toLowerCase(), phone: phone ? phone.trim() : null, subject: subject.trim(), message: message.trim() };
    try {
      await dbFetch('jeevarasi_contacts', 'POST', record, null);
      await Promise.allSettled([notifyEmail(record), notifyWhatsApp(record)]);
      return res.json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
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

  // DB create (stats / events / projects / fundraising / contacts)
  if (DB_TABLES[action]) {
    try   { return res.json(await dbFetch(DB_TABLES[action], 'POST', req.body, null)); }
    catch (e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(400).json({ error: 'Invalid action' });
});

// ── GET /api/admin ────────────────────────────────────────────
app.get('/api/admin', async (req, res) => {
  const action = req.query.action;

  // newsletter — requires auth, uses service role
  if (action === 'newsletter') {
    if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const r = await fetch(`${sbUrl()}/rest/v1/jeevarasi_newsletter?order=subscribed_at.desc`, {
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' }
      });
      if (!r.ok) { const t = await r.text(); throw new Error(t); }
      return res.json(await r.json() || []);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // contacts — requires auth, uses service role
  if (action === 'contacts') {
    if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.query.id;
    const qs = id ? `id=eq.${encodeURIComponent(id)}` : `order=created_at.desc`;
    try {
      const r = await fetch(`${sbUrl()}/rest/v1/jeevarasi_contacts?${qs}`, {
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' }
      });
      if (!r.ok) { const t = await r.text(); throw new Error(t); }
      return res.json(await r.json() || []);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

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
