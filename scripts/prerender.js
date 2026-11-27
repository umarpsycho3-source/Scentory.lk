const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const { injectProductMeta, escapeXml } = require('../server/seoHelper');

async function getProducts() {
  // 1. Try MongoDB Atlas
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB Atlas for prerender data...');
      const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const db = client.db();
      const pDocs = await db.collection('store_products').find({}).toArray();
      await client.close();
      if (Array.isArray(pDocs) && pDocs.length > 0) {
        console.log(`Fetched ${pDocs.length} products from MongoDB Atlas.`);
        return pDocs.map(p => {
          const { _id, ...clean } = p;
          return { id: _id, ...clean };
        });
      }
    } catch (err) {
      console.warn('MongoDB Atlas connection skipped/failed, falling back to local database.json:', err.message);
    }
  }

  // 2. Fallback to server/data/database.json
  const dbJsonPath = path.join(__dirname, '..', 'server', 'data', 'database.json');
  if (fs.existsSync(dbJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
      if (Array.isArray(data.products) && data.products.length > 0) {
        console.log(`Loaded ${data.products.length} products from local database.json.`);
        return data.products;
      }
    } catch (e) {
      console.error('Error reading local database.json:', e.message);
    }
  }

  return [];
}

async function runPrerender() {
  const distDir = path.join(__dirname, '..', 'client', 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`Dist index.html not found at ${indexHtmlPath}. Run vite build first.`);
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const baseUrl = 'https://scentory-lk.vercel.app';
  const products = await getProducts();

  console.log(`Starting SEO prerender for ${products.length} products...`);

  // Prerender each product
  let productCount = 0;
  for (const product of products) {
    if (!product || !product.id) continue;

    const productHtml = injectProductMeta(baseHtml, product, baseUrl);
    const prodDir = path.join(distDir, 'product', product.id);

    if (!fs.existsSync(prodDir)) {
      fs.mkdirSync(prodDir, { recursive: true });
    }

    // Write client/dist/product/:id/index.html
    fs.writeFileSync(path.join(prodDir, 'index.html'), productHtml, 'utf8');

    // Also write client/dist/product/:id.html
    fs.writeFileSync(path.join(distDir, 'product', `${product.id}.html`), productHtml, 'utf8');

    console.log(`Prerendered: /product/${product.id} (${product.name})`);
    productCount++;
  }

  // Prerender /shop
  try {
    const shopDir = path.join(distDir, 'shop');
    if (!fs.existsSync(shopDir)) fs.mkdirSync(shopDir, { recursive: true });

    let shopHtml = baseHtml;
    const shopTitle = 'All Fragrances & Decants Collection | SCENTORY.LK Sri Lanka';
    const shopDesc = 'Browse our full collection of luxury extrait de parfum atomizers and flacons. 10ml, 30ml, 50ml, and 100ml authentic perfume decants in Sri Lanka.';
    const shopSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${baseUrl}/shop#collection`,
          "url": `${baseUrl}/shop`,
          "name": shopTitle,
          "description": shopDesc
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${baseUrl}/shop#breadcrumb`,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
            { "@type": "ListItem", "position": 2, "name": "All Fragrances", "item": `${baseUrl}/shop` }
          ]
        }
      ]
    };

    shopHtml = shopHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(shopTitle)}</title>`);
    shopHtml = shopHtml.replace(/<meta name="title" content=".*?" \/>/i, `<meta name="title" content="${escapeXml(shopTitle)}" />`);
    shopHtml = shopHtml.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeXml(shopTitle)}" />`);
    shopHtml = shopHtml.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeXml(shopDesc)}" />`);
    shopHtml = shopHtml.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeXml(shopDesc)}" />`);
    shopHtml = shopHtml.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${baseUrl}/shop" />`);
    shopHtml = shopHtml.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${baseUrl}/shop" />`);
    shopHtml = shopHtml.replace(
      /<script id="scentory-ldjson" type="application\/ld\+json">[\s\S]*?<\/script>/i,
      `<script id="scentory-ldjson" type="application/ld+json">\n${JSON.stringify(shopSchema, null, 2)}\n    </script>`
    );

    fs.writeFileSync(path.join(shopDir, 'index.html'), shopHtml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'shop.html'), shopHtml, 'utf8');
    console.log('Prerendered: /shop');
  } catch (e) {
    console.warn('Prerender /shop warning:', e.message);
  }

  // Prerender /reviews
  try {
    const revDir = path.join(distDir, 'reviews');
    if (!fs.existsSync(revDir)) fs.mkdirSync(revDir, { recursive: true });

    let revHtml = baseHtml;
    const revTitle = 'Customer Reviews & Fragrance Ratings | SCENTORY.LK Sri Lanka';
    const revDesc = 'Read verified customer reviews and ratings for authentic fragrance decants from SCENTORY.LK. Trusted perfume atomizers across Sri Lanka.';
    const revSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ItemPage",
          "@id": `${baseUrl}/reviews#page`,
          "url": `${baseUrl}/reviews`,
          "name": revTitle,
          "description": revDesc
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${baseUrl}/reviews#breadcrumb`,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
            { "@type": "ListItem", "position": 2, "name": "Customer Reviews", "item": `${baseUrl}/reviews` }
          ]
        }
      ]
    };

    revHtml = revHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(revTitle)}</title>`);
    revHtml = revHtml.replace(/<meta name="title" content=".*?" \/>/i, `<meta name="title" content="${escapeXml(revTitle)}" />`);
    revHtml = revHtml.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeXml(revTitle)}" />`);
    revHtml = revHtml.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeXml(revDesc)}" />`);
    revHtml = revHtml.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeXml(revDesc)}" />`);
    revHtml = revHtml.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${baseUrl}/reviews" />`);
    revHtml = revHtml.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${baseUrl}/reviews" />`);
    revHtml = revHtml.replace(
      /<script id="scentory-ldjson" type="application\/ld\+json">[\s\S]*?<\/script>/i,
      `<script id="scentory-ldjson" type="application/ld+json">\n${JSON.stringify(revSchema, null, 2)}\n    </script>`
    );

    fs.writeFileSync(path.join(revDir, 'index.html'), revHtml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'reviews.html'), revHtml, 'utf8');
    console.log('Prerendered: /reviews');
  } catch (e) {
    console.warn('Prerender /reviews warning:', e.message);
  }

  console.log(`Prerender complete! Successfully generated ${productCount} product pages + static routes.`);
}

runPrerender().catch(err => {
  console.error('Prerender fatal error:', err);
  process.exit(1);
});
