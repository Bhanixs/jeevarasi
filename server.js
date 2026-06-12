/**
 * Local dev server for Jeevarsi admin panel
 * Run: npm install && npm run dev
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Test credentials (match .env.example)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jeevarsi.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Jeevarsi@2025';

// In-memory token store
const tokens = new Set();

// Multer file upload config
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Serve static files
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(__dirname));

// Auth middleware
function verifyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.substring(7);
  if (!tokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/* ============================================
   API ROUTES
   ============================================ */

// Login (JSON body)
app.post('/api/admin', express.json(), (req, res, next) => {
  if (req.query.action !== 'login') return next();

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  tokens.add(token);
  res.json({ token });
});

// Upload (multipart form)
app.post('/api/admin', upload.single('file'), verifyAuth, (req, res, next) => {
  if (req.query.action !== 'upload') return next();

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Delete (JSON body)
app.delete('/api/admin', express.json(), verifyAuth, (req, res, next) => {
  if (req.query.action !== 'delete') return next();

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  const filename = path.basename(url);
  const filepath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
  res.json({ success: true });
});

// Gallery (public, no auth)
app.get('/api/admin', (req, res, next) => {
  if (req.query.action !== 'gallery') return next();

  const files = fs.readdirSync(UPLOAD_DIR).map(name => {
    const ext = path.extname(name).toLowerCase();
    const contentType =
      ext === '.mp4' ? 'video/mp4' :
      ext === '.png' ? 'image/png' :
      'image/jpeg';
    return {
      url: `/uploads/${name}`,
      pathname: `jeevarasi-gallery/${name}`,
      uploadedAt: new Date(fs.statSync(path.join(UPLOAD_DIR, name)).mtime).toISOString(),
      contentType
    };
  }).reverse();
  res.json(files);
});

// Catch-all for unmatched API actions
app.all('/api/admin', (req, res) => {
  res.status(400).json({ error: 'Invalid action or method' });
});

/* ============================================
   START
   ============================================ */

app.listen(PORT, () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
  console.log(`📝 Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Test login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`📁 Uploads folder: ${UPLOAD_DIR}`);
});
