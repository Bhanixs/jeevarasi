const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;


const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@jeevarsi.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Jeevarsi@2025';
const ADMIN_EMAIL    = 'admin@jeevarsi.org';
const ADMIN_PASSWORD = 'Jeevarsi@2025';
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
  event_registrations: 'created_at.desc',
  stats:       'jeevarasi_stats',
  events:      'jeevarasi_events',
  projects:    'jeevarasi_projects',
  fundraising: 'jeevarasi_fundraising',
  contacts:    'jeevarasi_contacts',
  reviews:     'jeevarasi_reviews',
  blogs:       'jeevarasi_blogs'
};
const DB_ORDER = {
  stats:       'sort_order.asc,created_at.asc',
  events:      'event_date.asc',
  projects:    'sort_order.asc,created_at.desc',
  fundraising: 'created_at.desc',
  contacts:    'created_at.desc',
  reviews:     'created_at.desc',
  blogs:       'sort_order.asc,created_at.desc'
 
};

// In-memory session tokens (cleared on server restart)
const tokens = new Set();


// ── LOCAL DB FALLBACK (for development & offline) ───────────
let dataDir = path.join(__dirname, 'data');
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
    console.warn('[CMS Database] Reading error, initializing fresh store:', err.message);
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

// ── SUPABASE CONFIG ───────────────────────────────────────────
function sbUrl() {
  const u = process.env.SUPABASE_URL || '';

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


// ── SUPABASE DB HELPER WITH LOCAL FALLBACK ─────────────────────
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
    if (r.status === 204) return null;
    if (!r.ok) {
      const t = await r.text();
      console.warn(`[Supabase error ${r.status}, falling back to local DB]:`, t);
      return localDbFetch(table, method, body, qs);
    }
    return r.json();
  } catch (err) {
    console.warn('[Supabase unreachable, falling back to local DB]:', err.message);
    return localDbFetch(table, method, body, qs);
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

// ── CLEAN URLS ─────────────────────────────────────────────────
// Redirect requests for the .html file to its extensionless URL
// (e.g. /about.html -> /about, /index.html -> /), then let
// express.static's `extensions` option resolve /about -> about.html.
app.get(/\.html$/, (req, res, next) => {
  if (req.path.endsWith('.html')) {
    const clean = req.path === '/index.html' ? '/' : req.path.slice(0, -5);
    return res.redirect(308, clean + req.url.slice(req.path.length));
  }
  next();
});

// ── STATIC FILES ──────────────────────────────────────────────
app.use(express.static(__dirname, { extensions: ['html'] }));

// ── POST /api/admin ───────────────────────────────────────────
app.post('/api/admin', express.json({ limit: '55mb' }), async (req, res) => {
  const action = req.query.action;

  // Login — no auth required
  if (action === 'login') {
    const { email, password } = req.body || {};

    const allowedEmails = [
      (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
      'admin@jeevarsi.org',
      '1234@gmail.com'
    ].filter(Boolean);
    const allowedPassword = process.env.ADMIN_PASSWORD || 'Jeevarsi@2025';

    if (!allowedEmails.includes((email || '').trim().toLowerCase()) || password !== allowedPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

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

  // Event registration — public, no auth required
  if (action === 'event_register') {
    const { event_id, event_title, name, email, phone } = req.body || {};
    if (!name || !email || !event_title)
      return res.status(400).json({ error: 'Missing required fields' });
    const record = {
      event_id: event_id || null,
      event_title: event_title.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null
    };
    try {
      await dbFetch('jeevarasi_event_registrations', 'POST', record, null);
      return res.json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // Review submission — public, no auth required
  if (action === 'review') {
    const { name, rating, message } = req.body || {};
    if (!name || !rating || !message)
      return res.status(400).json({ error: 'Missing required fields' });
    const r = parseInt(rating, 10);
    if (r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    const record = { name: name.trim(), rating: r, message: message.trim(), approved: false };
    try {
      await dbFetch('jeevarasi_reviews', 'POST', record, null);
      return res.json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });


  // Upload to Supabase Storage (with local fallback)

  // Upload to Supabase Storage
 
  if (action === 'upload') {
    try {
      const { filename, type, data, folder } = req.body || {};
      if (!filename || !data) return res.status(400).json({ error: 'Missing file data' });
      const buf    = Buffer.from(data, 'base64');

      if (!isSupabaseConfigured()) {
        const uploadDir = path.join(__dirname, 'images', 'uploads');
        try {
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const cleanName = `${Date.now()}-${path.basename(filename)}`;
          fs.writeFileSync(path.join(uploadDir, cleanName), buf);
          return res.json({ url: `images/uploads/${cleanName}` });
        } catch {
          return res.json({ url: `data:${type || 'image/jpeg'};base64,${data}` });
        }
      }

 
      const prefix = folder ? `jeevarasi-${folder}/` : STORE_PREFIX;
      const fp     = `${prefix}${Date.now()}-${path.basename(filename)}`;
      const r = await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}/${encodePath(fp)}`, {
        method:  'POST',
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': type || 'application/octet-stream' },
        body:    buf
      });
      if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: t }); }
      return res.json({ url: `${sbUrl()}/storage/v1/object/public/${BUCKET}/${encodePath(fp)}` });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }


  // DB create (stats / events / projects / fundraising / contacts / etc)

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


  // newsletter — requires auth
  if (action === 'newsletter') {
    if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      return res.json(await dbFetch('jeevarasi_newsletter', 'GET', null, 'order=subscribed_at.desc') || []);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // event_registrations — requires auth

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

  // event_registrations — requires auth, uses service role
 
  if (action === 'event_registrations') {
    if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    const eventId = req.query.event_id;
    const qs = eventId
      ? `event_id=eq.${encodeURIComponent(eventId)}&order=created_at.desc`
      : `order=created_at.desc`;
    try {

      return res.json(await dbFetch('jeevarasi_event_registrations', 'GET', null, qs) || []);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // contacts — requires auth

      const r = await fetch(`${sbUrl()}/rest/v1/jeevarasi_event_registrations?${qs}`, {
        headers: { apikey: sbAnon(), authorization: `Bearer ${sbService()}`, 'content-type': 'application/json' }
      });
      if (!r.ok) { const t = await r.text(); throw new Error(t); }
      return res.json(await r.json() || []);
    }
    catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // contacts — requires auth, uses service role
 
  if (action === 'contacts') {
    if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.query.id;
    const qs = id ? `id=eq.${encodeURIComponent(id)}` : `order=created_at.desc`;
    try {

      return res.json(await dbFetch('jeevarasi_contacts', 'GET', null, qs) || []);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // Gallery list from Supabase Storage (or local images fallback)
  if (action === 'gallery') {
    if (!isSupabaseConfigured()) {
      const defaultMedia = [
        { url: 'images/drive/mangrove-day-event.jpg', pathname: 'images/drive/mangrove-day-event.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
        { url: 'images/drive/student-field-visit.jpg', pathname: 'images/drive/student-field-visit.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
        { url: 'images/drive/nss-student-drive.jpg', pathname: 'images/drive/nss-student-drive.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
        { url: 'images/drive/sapling-planting.jpg', pathname: 'images/drive/sapling-planting.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' },
        { url: 'images/drive/tree-planting-fieldwork.jpg', pathname: 'images/drive/tree-planting-fieldwork.jpg', uploadedAt: new Date().toISOString(), contentType: 'image/jpeg' }
      ];
      return res.json(defaultMedia);
    }

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

  // Reviews — public: approved only; authed admin: all
  if (action === 'reviews') {
    const authed = isAuthed(req);
    const qs = authed ? 'order=created_at.desc' : 'approved=eq.true&order=created_at.desc';
    try {
      return res.json(await dbFetch('jeevarasi_reviews', 'GET', null, qs) || []);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // Blogs — by slug (single post); public: published only, authed admin: all
  if (action === 'blogs') {
    const slug = req.query.slug;
    const authed = isAuthed(req);
    let qs;
    if (slug) {
      qs = `slug=eq.${encodeURIComponent(slug)}`;
      if (!authed) qs += '&is_published=eq.true';
    } else {
      qs = authed ? `order=${DB_ORDER.blogs}` : `is_published=eq.true&order=${DB_ORDER.blogs}`;
    }
    try {
      return res.json(await dbFetch('jeevarasi_blogs', 'GET', null, qs) || []);
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
  console.log(`  Admin  : http://localhost:${PORT}/admin`);
  console.log(`  Login  : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Supa   : ${sbUrl() || '⚠️  SUPABASE_URL not set'}\n`);
});
