const path = require('path');

// ── CONFIG ────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@jeevarsi.org';
const ADMIN_PASSWORD = 'Jeevarsi@2025';
const TOKEN = 'jeevarsi-admin-token';
const STORE_PREFIX = 'jeevarasi-gallery/';
const BUCKET = 'gallery';

const DB_TABLES = {
  stats: 'jeevarasi_stats',
  events: 'jeevarasi_events',
  projects: 'jeevarasi_projects',
  fundraising: 'jeevarasi_fundraising',
  contacts: 'jeevarasi_contacts'
};

const DB_ORDER = {
  stats: 'sort_order.asc,created_at.asc',
  events: 'event_date.asc',
  projects: 'sort_order.asc,created_at.desc',
  fundraising: 'created_at.desc',
  contacts: 'created_at.desc'
};

// ── SUPABASE HELPERS ──────────────────────────────────────
function sbUrl() {
  const u = process.env.SUPABASE_URL;
  if (!u) throw new Error('SUPABASE_URL not set');
  // Strip trailing /rest/v1 or /storage/v1 if user included it in the URL
  return u.replace(/\/(rest|storage)\/v1\/?.*$/, '').replace(/\/$/, '');
}
function sbAnon() {
  const k = process.env.SUPABASE_ANON;
  if (!k) throw new Error('SUPABASE_ANON not set');
  return k;
}
function sbService() {
  const k = process.env.SUPABASE_SERVICE;
  if (!k) throw new Error('SUPABASE_SERVICE not set');
  return k;
}

// ── UTILITIES ─────────────────────────────────────────────
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function parseReq(req) {
  try {
    const u = new URL(req.url, 'http://localhost');
    return { action: u.searchParams.get('action'), id: u.searchParams.get('id') };
  } catch { return { action: null, id: null }; }
}

function verifyAuth(req) {
  return (req.headers.authorization || '') === `Bearer ${TOKEN}`;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.setEncoding('utf8');
    req.on('data', c => { buf += c; });
    req.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function inferCT(name) {
  const e = path.extname(name).toLowerCase();
  if (e === '.mp4') return 'video/mp4';
  if (e === '.png') return 'image/png';
  if (e === '.gif') return 'image/gif';
  if (e === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

// ── DATABASE API ──────────────────────────────────────────
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
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`DB ${method} (${r.status}): ${t}`); }
  if (r.status === 204) return null;
  return r.json();
}

async function handleDbGet(action, req, res) {
  const { id } = parseReq(req);
  try {
    const qs = id ? `id=eq.${encodeURIComponent(id)}` : `order=${DB_ORDER[action]}`;
    return send(res, 200, await dbFetch(DB_TABLES[action], 'GET', null, qs) || []);
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleDbCreate(action, req, res) {
  if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
  try {
    return send(res, 200, await dbFetch(DB_TABLES[action], 'POST', await readJson(req), null));
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleDbUpdate(action, req, res) {
  if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
  const { id } = parseReq(req);
  if (!id) return send(res, 400, { error: 'Missing id' });
  try {
    const body = await readJson(req);
    body.updated_at = new Date().toISOString();
    return send(res, 200, await dbFetch(DB_TABLES[action], 'PATCH', body, `id=eq.${encodeURIComponent(id)}`) || { success: true });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleDbDelete(action, req, res) {
  if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
  const { id } = parseReq(req);
  if (!id) return send(res, 400, { error: 'Missing id' });
  try {
    await dbFetch(DB_TABLES[action], 'DELETE', null, `id=eq.${encodeURIComponent(id)}`);
    return send(res, 200, { success: true });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

// ── STORAGE API ───────────────────────────────────────────
async function storageUpload(filePath, buf, ct) {
  const enc = encodePath(filePath);
  const r = await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}/${enc}`, {
    method: 'POST',
    headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': ct },
    body: buf
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Upload (${r.status}): ${t}`); }
  return { url: `${sbUrl()}/storage/v1/object/public/${BUCKET}/${enc}` };
}

async function storageList(prefix) {
  const r = await fetch(`${sbUrl()}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 100, offset: 0 })
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`List (${r.status}): ${t}`); }
  return (await r.json() || [])
    .filter(i => i && i.id && i.name !== '.emptyFolderPlaceholder')
    .map(i => {
      const full = `${prefix}${i.name}`;
      return {
        url: `${sbUrl()}/storage/v1/object/public/${BUCKET}/${encodePath(full)}`,
        pathname: full,
        uploadedAt: i.created_at || i.updated_at || new Date().toISOString(),
        contentType: inferCT(i.name)
      };
    });
}

async function storageDelete(filePath) {
  const r = await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prefixes: [filePath] })
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Delete (${r.status}): ${t}`); }
}

function extractStoragePath(url) {
  try {
    const u = new URL(url);
    const m = `/object/public/${BUCKET}/`;
    const idx = u.pathname.indexOf(m);
    if (idx !== -1) return decodeURIComponent(u.pathname.slice(idx + m.length));
  } catch {}
  return null;
}

// ── STORAGE HANDLERS ──────────────────────────────────────
async function handleLogin(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const { email, password } = await readJson(req);
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD)
      return send(res, 401, { error: 'Invalid email or password' });
    return send(res, 200, { token: TOKEN });
  } catch { return send(res, 400, { error: 'Invalid request' }); }
}

async function handleUpload(req, res) {
  if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
  try {
    const { filename, type, data } = await readJson(req);
    if (!filename || !data) return send(res, 400, { error: 'Missing file data' });
    const buf = Buffer.from(data, 'base64');
    if (!buf.length) return send(res, 400, { error: 'Invalid base64 data' });
    const fp = `${STORE_PREFIX}${Date.now()}-${path.basename(filename)}`;
    const result = await storageUpload(fp, buf, type || 'application/octet-stream');
    return send(res, 200, { url: result.url });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleDeleteMedia(req, res) {
  if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
  try {
    const { url } = await readJson(req);
    if (!url) return send(res, 400, { error: 'No URL provided' });
    const fp = extractStoragePath(url);
    if (!fp) return send(res, 400, { error: 'Invalid URL' });
    await storageDelete(fp);
    return send(res, 200, { success: true });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleGallery(res) {
  try { return send(res, 200, await storageList(STORE_PREFIX)); }
  catch (e) { return send(res, 500, { error: e.message }); }
}

// ── CONTACT FORM NOTIFICATIONS ────────────────────────────
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

async function handleNewsletter(req, res) {
  if (req.method === 'POST') {
    try {
      const { email } = await readJson(req);
      if (!email || !email.includes('@')) return send(res, 400, { error: 'Valid email required' });
      await dbFetch('jeevarasi_newsletter', 'POST', { email: email.trim().toLowerCase() }, null);
      return send(res, 200, { success: true });
    } catch (e) {
      if (e.message.includes('23505') || e.message.includes('unique')) return send(res, 200, { success: true });
      return send(res, 500, { error: e.message });
    }
  }
  if (req.method === 'GET') {
    if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
    try {
      const r = await fetch(`${sbUrl()}/rest/v1/jeevarasi_newsletter?order=subscribed_at.desc`, {
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' }
      });
      if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`DB (${r.status}): ${t}`); }
      return send(res, 200, await r.json() || []);
    } catch (e) { return send(res, 500, { error: e.message }); }
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function handleContact(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const { name, email, phone, subject, message } = await readJson(req);
    if (!name || !email || !subject || !message) return send(res, 400, { error: 'Missing required fields' });
    const record = { name: name.trim(), email: email.trim().toLowerCase(), phone: phone ? phone.trim() : null, subject: subject.trim(), message: message.trim() };
    await dbFetch('jeevarasi_contacts', 'POST', record, null);
    await Promise.allSettled([notifyEmail(record), notifyWhatsApp(record)]);
    return send(res, 200, { success: true });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

// ── MAIN HANDLER ──────────────────────────────────────────
const DB_ACTIONS = new Set(Object.keys(DB_TABLES));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return send(res, 200, {});

  const { action } = parseReq(req);

  // contacts GET — requires auth and uses service role (sensitive data)
  if (action === 'contacts' && req.method === 'GET') {
    if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
    try {
      const { id } = parseReq(req);
      const qs = id ? `id=eq.${encodeURIComponent(id)}` : `order=created_at.desc`;
      const r = await fetch(`${sbUrl()}/rest/v1/jeevarasi_contacts${qs ? '?' + qs : ''}`, {
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' }
      });
      if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`DB (${r.status}): ${t}`); }
      return send(res, 200, await r.json() || []);
    } catch (e) { return send(res, 500, { error: e.message }); }
  }

  if (DB_ACTIONS.has(action)) {
    if (req.method === 'GET') return handleDbGet(action, req, res);
    if (req.method === 'POST') return handleDbCreate(action, req, res);
    if (req.method === 'PATCH' || req.method === 'PUT') return handleDbUpdate(action, req, res);
    if (req.method === 'DELETE') return handleDbDelete(action, req, res);
    return send(res, 405, { error: 'Method not allowed' });
  }

  switch (action) {
    case 'login': return handleLogin(req, res);
    case 'upload': return handleUpload(req, res);
    case 'delete': return handleDeleteMedia(req, res);
    case 'gallery': return handleGallery(res);
    case 'contact': return handleContact(req, res);
    case 'newsletter': return handleNewsletter(req, res);
    default: return send(res, 400, { error: `Unknown action: ${action}` });
  }
}
