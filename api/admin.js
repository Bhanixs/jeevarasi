const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ── CONFIG ────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jeevarsi.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Jeevarsi@2025';
const TOKEN = 'jeevarsi-admin-token';
const STORE_PREFIX = 'jeevarasi-gallery/';
const BUCKET = 'gallery';

const DB_TABLES = {
  stats:               'jeevarasi_stats',
  events:              'jeevarasi_events',
  projects:            'jeevarasi_projects',
  fundraising:         'jeevarasi_fundraising',
  contacts:            'jeevarasi_contacts',
  reviews:             'jeevarasi_reviews',
  blogs:               'jeevarasi_blogs',
  newsletter:          'jeevarasi_newsletter',
  event_registrations: 'jeevarasi_event_registrations'
};

const DB_ORDER = {
  stats:               'sort_order.asc,created_at.asc',
  events:              'event_date.asc',
  projects:            'sort_order.asc,created_at.desc',
  fundraising:         'created_at.desc',
  contacts:            'created_at.desc',
  reviews:             'created_at.desc',
  blogs:               'sort_order.asc,created_at.desc',
  newsletter:          'subscribed_at.desc',
  event_registrations: 'created_at.desc'
};

// ── LOCAL DB FALLBACK (for development & offline) ───────────
let dataDir = path.join(__dirname, '..', 'data');
let dbFile = path.join(dataDir, 'local-db.json');

try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
} catch {
  dataDir = '/tmp';
  dbFile = path.join(dataDir, 'jeevarasi-db.json');
}

let memoryDb = null;

function getInitialData() {
  const now = new Date().toISOString();
  return {
    jeevarasi_stats: [
      { id: crypto.randomUUID(), label: 'Trees Planted', value: 300000, suffix: '+', icon_class: 'fas fa-tree', sort_order: 1, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), label: 'Hectares Restored', value: 200, suffix: '+', icon_class: 'fas fa-map-marked-alt', sort_order: 2, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), label: 'Plastic Collected (Tonnes)', value: 15, suffix: '+ T', icon_class: 'fas fa-recycle', sort_order: 3, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), label: 'Students Reached', value: 3000, suffix: '+', icon_class: 'fas fa-users', sort_order: 4, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), label: 'Community Clean-Up Drives', value: 20, suffix: '+', icon_class: 'fas fa-hands-helping', sort_order: 5, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), label: 'Conservation Workshops', value: 10, suffix: '+', icon_class: 'fas fa-chalkboard-teacher', sort_order: 6, created_at: now, updated_at: now }
    ],
    jeevarasi_events: [
      {
        id: crypto.randomUUID(),
        title: 'Mangrove Sapling Plantation Drive',
        description: 'Join our volunteers and conservation team in restoring the coastal mangrove ecosystem. Saplings, equipment, and refreshments provided.',
        event_date: '2025-10-18',
        location: 'Kottakuppam / Auroville Wetland Area',
        category: 'Environment',
        image_url: 'images/drive/mangrove-day-event.jpg',
        status: 'open',
        is_published: true,
        created_at: now,
        updated_at: now
      },
      {
        id: crypto.randomUUID(),
        title: 'Youth Citizen Scientist Workshop',
        description: 'Hands-on experiential workshop for students to explore local bird species, butterfly tagging, and sustainable soil conservation.',
        event_date: '2025-11-08',
        location: 'Jeevarasi Nature School Campus',
        category: 'Education',
        image_url: 'images/drive/student-field-visit.jpg',
        status: 'open',
        is_published: true,
        created_at: now,
        updated_at: now
      }
    ],
    jeevarasi_projects: [
      {
        id: crypto.randomUUID(),
        title: 'Planting 3 Lakhs+ Trees Across Pondicherry',
        description: 'Community-driven mass afforestation initiative restoring indigenous flora and providing sanctuary for birds and pollinators.',
        status: 'live',
        year: '2023 – 2025',
        image_url: 'images/drive/sapling-planting.jpg',
        sort_order: 1,
        is_published: true,
        created_at: now,
        updated_at: now
      },
      {
        id: crypto.randomUUID(),
        title: 'Plastic Clean-Up & Wetland Restoration',
        description: 'Over 15 tonnes of plastic waste cleared from coastal waterways in collaboration with university NSS volunteers.',
        status: 'completed',
        year: '2024',
        image_url: 'images/drive/nss-student-drive.jpg',
        sort_order: 2,
        is_published: true,
        created_at: now,
        updated_at: now
      }
    ],
    jeevarasi_fundraising: [
      {
        id: crypto.randomUUID(),
        title: 'Wild Sapling Nursery & Bird Nesting Project',
        description: 'Help us expand our native tree sapling nursery and install 500 nesting boxes for breeding sparrows and wild birds.',
        goal_amount: 500000,
        raised_amount: 340000,
        status: 'active',
        image_url: 'images/drive/tree-planting-fieldwork.jpg',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        qr_code_url: '',
        is_published: true,
        created_at: now,
        updated_at: now
      }
    ],
    jeevarasi_blogs: [
      {
        id: crypto.randomUUID(),
        title: 'Jeevarasi Trust Founded — A New Chapter in Conservation',
        slug: 'jeevarasi-trust-founded',
        category: 'environment',
        author: 'Jeevarasi Team',
        summary: 'Jeevarasi — The Nature School was founded as a Pondicherry-based Trust with a vision to bring people closer to the wild through experiential education and conservation.',
        content_type: 'editor',
        content_html: '<p>Jeevarasi — The Nature School was founded as a Pondicherry-based Trust with a vision to bring people closer to the wild through experiential education and conservation. We focus on creating awareness by educating about the importance of species in their natural habitat.</p>',
        cover_image_url: 'images/drive/sapling-planting.jpg',
        is_published: true,
        sort_order: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: crypto.randomUUID(),
        title: 'Experiential Education at Jeevarasi — Learning by Experience',
        slug: 'experiential-education-at-jeevarasi',
        category: 'education',
        author: 'Education Team',
        summary: 'Our experiential teaching approach helps guests understand conservation better through observation, touch, feel, and build experiences — reconnecting them with nature.',
        content_type: 'editor',
        content_html: '<p>Our experiential teaching approach helps guests understand conservation better through observation, touch, feel, and build experiences — reconnecting them with nature.</p>',
        cover_image_url: 'images/drive/nss-student-drive.jpg',
        is_published: true,
        sort_order: 2,
        created_at: now,
        updated_at: now
      }
    ],
    jeevarasi_reviews: [
      {
        id: crypto.randomUUID(),
        name: 'Dr. Priya Ramesh',
        rating: 5,
        message: 'Visiting Jeevarasi was an unforgettable experience for our school students. Seeing animals and exotic plants in a protected, loving sanctuary taught them true respect for wildlife.',
        approved: true,
        created_at: now,
        updated_at: now
      },
      {
        id: crypto.randomUUID(),
        name: 'Arun Kumar',
        rating: 5,
        message: 'Volunteered for the tree planting drive in Pondicherry. The passion and dedication of the Jeevarasi team is inspiring. Everyone should visit and support their work!',
        approved: true,
        created_at: now,
        updated_at: now
      }
    ],
    jeevarasi_contacts: [],
    jeevarasi_newsletter: [],
    jeevarasi_event_registrations: []
  };
}

function loadDb() {
  if (memoryDb) return memoryDb;
  try {
    if (fs.existsSync(dbFile)) {
      memoryDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    }
  } catch (err) {
    console.warn('[CMS Database] Reading error:', err.message);
  }
  if (!memoryDb) {
    memoryDb = getInitialData();
    saveDb();
  }
  return memoryDb;
}

function saveDb() {
  if (!memoryDb) return;
  try {
    fs.writeFileSync(dbFile, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (err) {
    console.warn('[CMS Database] Failed to write db file:', err.message);
  }
}

function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || '';
  const service = process.env.SUPABASE_SERVICE || '';
  const anon = process.env.SUPABASE_ANON || '';
  if (!url || url.includes('your-project') || !url.startsWith('http')) return false;
  if (!service || service.includes('your_') || !anon || anon.includes('your_')) return false;
  return true;
}

function parseQs(qs) {
  const filters = [];
  let sortField = null;
  let sortDir = 'asc';

  if (!qs) return { filters, sortField, sortDir };

  const params = new URLSearchParams(qs);
  for (const [key, val] of params.entries()) {
    if (key === 'order') {
      const firstPart = val.split(',')[0];
      const [field, dir] = firstPart.split('.');
      sortField = field;
      sortDir = dir === 'desc' ? 'desc' : 'asc';
    } else if (val.startsWith('eq.')) {
      const target = val.slice(3);
      filters.push({ field: key, op: 'eq', value: target });
    }
  }
  return { filters, sortField, sortDir };
}

function localDbFetch(table, method, body, qs) {
  const db = loadDb();
  if (!db[table]) db[table] = [];

  if (method === 'GET') {
    const { filters, sortField, sortDir } = parseQs(qs);
    let results = db[table].filter(item => {
      for (const f of filters) {
        const itemVal = item[f.field];
        if (typeof itemVal === 'boolean') {
          if (String(itemVal) !== f.value) return false;
        } else if (String(itemVal !== undefined && itemVal !== null ? itemVal : '') !== f.value) {
          return false;
        }
      }
      return true;
    });

    if (sortField) {
      results.sort((a, b) => {
        let va = a[sortField];
        let vb = b[sortField];
        if (va === undefined || va === null) va = '';
        if (vb === undefined || vb === null) vb = '';
        if (typeof va === 'string' && typeof vb === 'string') {
          return sortDir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
        }
        return sortDir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
      });
    }

    return JSON.parse(JSON.stringify(results));
  }

  if (method === 'POST') {
    const now = new Date().toISOString();
    const record = {
      id: (body && body.id) ? body.id : crypto.randomUUID(),
      created_at: (body && body.created_at) ? body.created_at : now,
      updated_at: (body && body.updated_at) ? body.updated_at : now,
      ...(body || {})
    };

    if (table === 'jeevarasi_newsletter') {
      const existing = db[table].find(x => x.email === record.email);
      if (existing) return [existing];
    }

    db[table].push(record);
    saveDb();
    return [JSON.parse(JSON.stringify(record))];
  }

  if (method === 'PATCH') {
    const { filters } = parseQs(qs);
    const idFilter = filters.find(f => f.field === 'id');
    const targetId = idFilter ? idFilter.value : (body && body.id);
    const idx = db[table].findIndex(x => x.id === targetId);
    if (idx === -1) return null;

    db[table][idx] = {
      ...db[table][idx],
      ...(body || {}),
      updated_at: new Date().toISOString()
    };
    saveDb();
    return [JSON.parse(JSON.stringify(db[table][idx]))];
  }

  if (method === 'DELETE') {
    const { filters } = parseQs(qs);
    const idFilter = filters.find(f => f.field === 'id');
    const targetId = idFilter ? idFilter.value : null;
    if (targetId) {
      db[table] = db[table].filter(x => x.id !== targetId);
      saveDb();
    }
    return null;
  }

  return null;
}

// ── SUPABASE HELPERS ──────────────────────────────────────
function sbUrl() {
  const u = process.env.SUPABASE_URL || '';
  return u.replace(/\/(rest|storage)\/v1\/?.*$/, '').replace(/\/$/, '');
}
function sbAnon() {
  return process.env.SUPABASE_ANON || '';
}
function sbService() {
  return process.env.SUPABASE_SERVICE || '';
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

// ── DATABASE API WITH LOCAL FALLBACK ──────────────────────
async function dbFetch(table, method, body, qs) {
  if (!isSupabaseConfigured()) {
    return localDbFetch(table, method, body, qs);
  }
  try {
    const url = `${sbUrl()}/rest/v1/${table}${qs ? '?' + qs : ''}`;
    const headers = { apikey: sbAnon(), 'content-type': 'application/json' };
    if (method !== 'GET') {
      headers.authorization = `Bearer ${sbService()}`;
      headers.prefer = 'return=representation';
    }
    const opts = { method, headers };
    if (body !== null && body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.warn(`[Supabase error ${r.status}, falling back to local DB]:`, t);
      return localDbFetch(table, method, body, qs);
    }
    if (r.status === 204) return null;
    return r.json();
  } catch (err) {
    console.warn('[Supabase unreachable, falling back to local DB]:', err.message);
    return localDbFetch(table, method, body, qs);
  }
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
    const allowedEmails = [
      (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
      'admin@jeevarsi.org',
      '1234@gmail.com'
    ].filter(Boolean);
    const allowedPassword = process.env.ADMIN_PASSWORD || 'Jeevarsi@2025';

    if (!allowedEmails.includes((email || '').trim().toLowerCase()) || password !== allowedPassword) {
      return send(res, 401, { error: 'Invalid email or password' });
    }
    return send(res, 200, { token: TOKEN });
  } catch { return send(res, 400, { error: 'Invalid request' }); }
}

async function handleUpload(req, res) {
  if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
  try {
    const { filename, type, data, folder } = await readJson(req);
    if (!filename || !data) return send(res, 400, { error: 'Missing file data' });
    const buf = Buffer.from(data, 'base64');
    if (!buf.length) return send(res, 400, { error: 'Invalid base64 data' });
    if (!isSupabaseConfigured()) {
      return send(res, 200, { url: `data:${type || 'image/jpeg'};base64,${data}` });
    }
    const prefix = folder ? `jeevarasi-${folder}/` : STORE_PREFIX;
    const fp = `${prefix}${Date.now()}-${path.basename(filename)}`;
    const result = await storageUpload(fp, buf, type || 'application/octet-stream');
    return send(res, 200, { url: result.url });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleDeleteMedia(req, res) {
  if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
  try {
    const { url } = await readJson(req);
    if (!url) return send(res, 400, { error: 'No URL provided' });
    if (!isSupabaseConfigured()) return send(res, 200, { success: true });
    const fp = extractStoragePath(url);
    if (!fp) return send(res, 400, { error: 'Invalid URL' });
    await storageDelete(fp);
    return send(res, 200, { success: true });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleGallery(res) {
  if (!isSupabaseConfigured()) {
    const defaultMedia = [
      { url: 'images/drive/mangrove-day-event.jpg', pathname: 'images/drive/mangrove-day-event.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
      { url: 'images/drive/student-field-visit.jpg', pathname: 'images/drive/student-field-visit.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
      { url: 'images/drive/nss-student-drive.jpg', pathname: 'images/drive/nss-student-drive.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
      { url: 'images/drive/sapling-planting.jpg', pathname: 'images/drive/sapling-planting.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
      { url: 'images/drive/tree-planting-fieldwork.jpg', pathname: 'images/drive/tree-planting-fieldwork.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' }
    ];
    return send(res, 200, defaultMedia);
  }
  try { return send(res, 200, await storageList(STORE_PREFIX)); }
  catch (e) { return send(res, 500, { error: e.message }); }
}

// ── CONTACT FORM NOTIFICATIONS ────────────────────────────
async function notifyEmail(data) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const to = process.env.NOTIFY_EMAIL || 'jeevarasidigital@gmail.com';
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
  if (action === 'newsletter') {
    if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
    try {
      return send(res, 200, await dbFetch('jeevarasi_newsletter', 'GET', null, 'order=subscribed_at.desc') || []);
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

async function handleReviewSubmit(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const { name, rating, message } = await readJson(req);
    if (!name || !rating || !message) return send(res, 400, { error: 'Missing required fields' });
    const r = parseInt(rating, 10);
    if (r < 1 || r > 5) return send(res, 400, { error: 'Rating must be between 1 and 5' });
    const record = { name: name.trim(), rating: r, message: message.trim(), approved: false };
    await dbFetch('jeevarasi_reviews', 'POST', record, null);
    return send(res, 200, { success: true });
  } catch (e) { return send(res, 500, { error: e.message }); }
}

async function handleEventRegister(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const { event_id, event_title, name, email, phone } = await readJson(req);
    if (!name || !email || !event_title) return send(res, 400, { error: 'Missing required fields' });
    const record = {
      event_id: event_id || null,
      event_title: event_title.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null
    };
    await dbFetch('jeevarasi_event_registrations', 'POST', record, null);
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

  // contacts GET — requires auth
  if (action === 'contacts' && req.method === 'GET') {
    if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
    try {
      const { id } = parseReq(req);
      const qs = id ? `id=eq.${encodeURIComponent(id)}` : `order=created_at.desc`;
      return send(res, 200, await dbFetch('jeevarasi_contacts', 'GET', null, qs) || []);
    } catch (e) { return send(res, 500, { error: e.message }); }
  }

  // event_registrations GET — requires auth
  if (action === 'event_registrations' && req.method === 'GET') {
    if (!verifyAuth(req)) return send(res, 401, { error: 'Unauthorized' });
    try {
      const u = new URL(req.url, 'http://localhost');
      const eventId = u.searchParams.get('event_id');
      const qs = eventId
        ? `event_id=eq.${encodeURIComponent(eventId)}&order=created_at.desc`
        : `order=created_at.desc`;
      return send(res, 200, await dbFetch('jeevarasi_event_registrations', 'GET', null, qs) || []);
    } catch (e) { return send(res, 500, { error: e.message }); }
  }

  // Reviews GET — public: approved only; authed admin: all
  if (action === 'reviews' && req.method === 'GET') {
    const authed = verifyAuth(req);
    const qs = authed ? 'order=created_at.desc' : 'approved=eq.true&order=created_at.desc';
    try {
      return send(res, 200, await dbFetch('jeevarasi_reviews', 'GET', null, qs) || []);
    } catch (e) { return send(res, 500, { error: e.message }); }
  }

  // Blogs GET — by slug (single post); public: published only, authed admin: all
  if (action === 'blogs' && req.method === 'GET') {
    const u = new URL(req.url, 'http://localhost');
    const slug = u.searchParams.get('slug');
    const authed = verifyAuth(req);
    let qs;
    if (slug) {
      qs = `slug=eq.${encodeURIComponent(slug)}`;
      if (!authed) qs += '&is_published=eq.true';
    } else {
      qs = authed ? `order=${DB_ORDER.blogs}` : `is_published=eq.true&order=${DB_ORDER.blogs}`;
    }
    try {
      return send(res, 200, await dbFetch('jeevarasi_blogs', 'GET', null, qs) || []);
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
    case 'event_register': return handleEventRegister(req, res);
    case 'review': return handleReviewSubmit(req, res);
    default: return send(res, 400, { error: `Unknown action: ${action}` });
  }
}
