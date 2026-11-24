const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable High-Performance Gzip/Deflate Compression
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Enable CORS
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Ensure MongoDB Atlas is fully connected and synced before any API request executes in serverless
const db = require('./db');
app.use(async (req, res, next) => {
  if (db && typeof db.ensureConnected === 'function') {
    await db.ensureConnected();
  }
  next();
});


// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const productsDir = path.join(uploadsDir, 'products');
const receiptsDir = path.join(uploadsDir, 'receipts');

[uploadsDir, productsDir, receiptsDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    // In serverless / read-only filesystem environments (e.g. Netlify/Vercel), ignore mkdir failures
  }
});

// Serve uploaded media with caching
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
}));

// Serve brand logo directly with caching
app.get('/brand-logo.png', (req, res) => {
  const logoPath = path.join(__dirname, '..', 'brand-logo.png');
  if (fs.existsSync(logoPath)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return res.sendFile(logoPath);
  }
  res.status(404).send('Logo not found');
});

// SEO: robots.txt for Google & search engine crawlers
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Sitemap: https://scentory.lk/sitemap.xml
`);
});

// SEO: dynamic sitemap.xml for Google indexing
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  const baseUrl = 'https://scentory.lk';
  let products = [];
  try {
    products = require('./db').getProducts();
  } catch (e) {}

  const today = new Date().toISOString().split('T')[0];
  const productUrls = (products || []).map(p => `
  <url>
    <loc>${baseUrl}/#product-${p.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#shop</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#reviews</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>${productUrls}
</urlset>`;
  res.send(xml);
});

// Serve hero videos directly with streaming and range support
app.get(['/hero-perfume-video.mp4', '/hero-uploaded-video.mp4'], (req, res) => {
  const filename = req.path.replace('/', '');
  const p1 = path.join(__dirname, 'uploads', filename);
  const p2 = path.join(__dirname, '..', 'client', 'public', filename);
  if (fs.existsSync(p1)) return res.sendFile(p1);
  if (fs.existsSync(p2)) return res.sendFile(p2);
  res.status(404).send('Video not found');
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    store: 'SCENTORY.LK',
    time: new Date().toISOString()
  });
});

// Serve frontend build if present with long-term caching
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  // Static assets with immutable cache
  app.use('/assets', express.static(path.join(clientDist, 'assets'), {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }));

  app.use(express.static(clientDist, {
    maxAge: '1h'
  }));

  // Explicit route for /admin URL
  app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // Express 5 compatible SPA fallback
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Start Server if run directly (Local development / dedicated server)
if (!process.env.NETLIFY && !process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`   SCENTORY.LK Luxury Perfume Store Online!`);
    console.log(`   Customer Store: http://localhost:${PORT}`);
    console.log(`   Admin Access URL: http://localhost:${PORT}/admin`);
    console.log(`   Admin Login: admin@scentory.lk / admin123`);
    console.log(`   SEO Sitemap: http://localhost:${PORT}/sitemap.xml`);
    console.log(`   SEO Robots: http://localhost:${PORT}/robots.txt`);
    console.log(`===============================================`);
  });
}

module.exports = app;
