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
  if (req.path.startsWith('/api') || req.path === '/sitemap.xml') {
    try {
      if (db && typeof db.ensureConnected === 'function') {
        await db.ensureConnected();
      }
    } catch (err) {
      console.error('Database connection error on API request:', err.message);
      if (req.path.startsWith('/api')) {
        return res.status(503).json({
          message: 'Database service is currently unavailable. Please verify MONGODB_URI configuration in Vercel.',
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
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

// Dynamic endpoint for product images: checks uploads/products, client/dist/uploads/products, or decodes from MongoDB
app.get('/uploads/products/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  const p1 = path.join(productsDir, filename);
  if (fs.existsSync(p1)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return res.sendFile(p1);
  }

  const p2 = path.join(__dirname, '..', 'client', 'dist', 'uploads', 'products', filename);
  if (fs.existsSync(p2)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return res.sendFile(p2);
  }

  const p3 = path.join(__dirname, '..', 'client', 'public', 'uploads', 'products', filename);
  if (fs.existsSync(p3)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return res.sendFile(p3);
  }

  // Fallback: Query database and decode image buffer
  const productId = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  try {
    if (db && typeof db.ensureConnected === 'function') {
      await db.ensureConnected();
      const p = db.getProductById(productId);
      if (p && Array.isArray(p.images) && p.images[0]) {
        const raw = p.images[0];
        if (typeof raw === 'string' && raw.startsWith('data:image/')) {
          const base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
          return res.status(200).send(buf);
        }
      }
    }
  } catch (err) {
    console.error('Dynamic image error:', err.message);
  }

  next();
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

// Google Search Console Verification HTML
app.get('/googlebf136b5ad5675810.html', (req, res) => {
  res.type('text/html');
  res.send('google-site-verification: googlebf136b5ad5675810.html');
});

// Helper to escape XML special characters
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastmod(dateVal) {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

// SEO: robots.txt for Google & search engine crawlers
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /checkout
Disallow: /profile
Sitemap: https://scentory-lk.vercel.app/sitemap.xml
`);
});

// SEO: dynamic sitemap.xml for Google Search Console indexing
app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');

  const baseUrl = 'https://scentory-lk.vercel.app';
  const today = new Date().toISOString().split('T')[0];

  let products = [];
  try {
    const pList = require('./db').getProducts();
    if (Array.isArray(pList)) {
      products = pList.filter(p => p && p.id);
    }
  } catch (e) {}

  const productUrls = products.map(p => `  <url>
    <loc>${baseUrl}/product/${escapeXml(encodeURIComponent(p.id))}</loc>
    <lastmod>${formatLastmod(p.updatedAt || p.createdAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/shop</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/reviews</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>${productUrls ? '\n' + productUrls : ''}
</urlset>`;

  res.status(200).send(xml);
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

  // Dynamic SSR Route for /product/:id with rich SEO structured data
  app.get('/product/:id', async (req, res, next) => {
    try {
      const productId = req.params.id;
      let product = null;

      if (db && typeof db.getProductById === 'function') {
        product = db.getProductById(productId);
      }
      if (!product && db && typeof db.ensureConnected === 'function') {
        await db.ensureConnected();
        product = db.getProductById(productId);
      }

      if (product) {
        // Check for prerendered file first
        const prerenderedPath = path.join(clientDist, 'product', productId, 'index.html');
        if (fs.existsSync(prerenderedPath)) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
          return res.sendFile(prerenderedPath);
        }

        // Dynamically inject into template HTML
        const templatePath = path.join(clientDist, 'index.html');
        if (fs.existsSync(templatePath)) {
          const { injectProductMeta } = require('./seoHelper');
          const rawHtml = fs.readFileSync(templatePath, 'utf8');
          const enrichedHtml = injectProductMeta(rawHtml, product, 'https://scentory-lk.vercel.app');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
          return res.status(200).send(enrichedHtml);
        }
      }
    } catch (err) {
      console.error('SSR /product/:id error:', err.message);
    }
    next();
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
