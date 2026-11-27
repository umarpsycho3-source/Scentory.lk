// Shared SEO Helper for Server-Side Rendering and Prerendering
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateProductSchema(product, baseUrl = 'https://scentory-lk.vercel.app') {
  const variants = Array.isArray(product.variants) && product.variants.length > 0
    ? product.variants
    : [{ price: 3500, stock: 10 }];

  const prices = variants
    .map(v => Number(v.discountPrice || v.price) || 0)
    .filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 3500;
  const maxPrice = prices.length ? Math.max(...prices) : 3500;

  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const inStock = totalStock > 0 || (variants[0].stock !== 0);

  // Schema.org recommends http/https image URLs over data: base64 URIs for Rich Snippets
  let imageList = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    imageList = product.images.map((img, idx) => {
      if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
        return img;
      }
      if (typeof img === 'string' && img.startsWith('/')) {
        return `${baseUrl}${img}`;
      }
      // If image is a base64 string, fallback to brand logo for search crawlers
      return `${baseUrl}/brand-logo.png`;
    });
  }
  if (!imageList.length) {
    imageList = [`${baseUrl}/brand-logo.png`];
  }

  const family = product.scentFamily ? ` (${product.scentFamily})` : '';
  const description = product.description && product.description.trim()
    ? product.description.trim()
    : `Discover authentic ${product.name}${family} luxury extrait de parfum decant in Sri Lanka. 100% genuine with islandwide delivery.`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${baseUrl}/product/${product.id}#product`,
        "name": product.name,
        "image": imageList,
        "description": description,
        "sku": product.id,
        "brand": {
          "@type": "Brand",
          "name": "SCENTORY.LK"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "LKR",
          "lowPrice": minPrice,
          "highPrice": maxPrice,
          "offerCount": variants.length,
          "price": minPrice,
          "priceValidUntil": "2027-12-31",
          "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "url": `${baseUrl}/product/${product.id}`,
          "seller": {
            "@type": "Organization",
            "name": "SCENTORY.LK"
          }
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/product/${product.id}#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": `${baseUrl}/`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "All Fragrances",
            "item": `${baseUrl}/shop`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": product.name,
            "item": `${baseUrl}/product/${product.id}`
          }
        ]
      },
      {
        "@type": "OnlineStore",
        "@id": `${baseUrl}/#store`,
        "name": "SCENTORY.LK",
        "url": `${baseUrl}/`,
        "logo": `${baseUrl}/brand-logo.png`,
        "image": `${baseUrl}/brand-logo.png`,
        "description": "Sri Lanka's dedicated house for authentic niche & designer perfume decants. Handcrafted into sterile clinical glass atomizers in Ulapane.",
        "telephone": "+94763151311",
        "priceRange": "LKR 1,300 - LKR 25,000",
        "currenciesAccepted": "LKR",
        "paymentAccepted": "Bank Deposit, Online Bank Transfer",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Nawalapitiya Road",
          "addressLocality": "Ulapane",
          "addressRegion": "Central Province",
          "addressCountry": "LK"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 7.0983,
          "longitude": 80.5736
        },
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
          ],
          "opens": "08:00",
          "closes": "22:00"
        },
        "sameAs": [
          "https://www.instagram.com/scentory.lk",
          "https://wa.me/94763151311"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": `${baseUrl}/`,
        "name": "SCENTORY.LK",
        "description": "Luxury Perfumes & Decants in Sri Lanka"
      }
    ]
  };
}

function injectProductMeta(htmlTemplate, product, baseUrl = 'https://scentory-lk.vercel.app') {
  if (!htmlTemplate || !product) return htmlTemplate;

  const title = `${product.name} | Luxury Extrait De Parfum | SCENTORY.LK`;
  const family = product.scentFamily ? ` (${product.scentFamily})` : '';
  const description = product.description && product.description.trim()
    ? product.description.trim()
    : `Buy authentic ${product.name}${family} luxury extrait de parfum decant in Sri Lanka. 100% genuine with islandwide delivery.`;
  const canonical = `${baseUrl}/product/${product.id}`;
  const ogImage = `${baseUrl}/brand-logo.png`;

  const schemaObj = generateProductSchema(product, baseUrl);
  const schemaJson = JSON.stringify(schemaObj, null, 2);

  let output = htmlTemplate;

  // Replace Title
  output = output.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  output = output.replace(/<meta name="title" content=".*?" \/>/i, `<meta name="title" content="${escapeXml(title)}" />`);
  output = output.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeXml(title)}" />`);
  output = output.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeXml(title)}" />`);

  // Replace Description
  output = output.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeXml(description)}" />`);
  output = output.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeXml(description)}" />`);
  output = output.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeXml(description)}" />`);

  // Replace Canonical & URL
  output = output.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonical}" />`);
  output = output.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${canonical}" />`);

  // Replace JSON-LD schema
  output = output.replace(
    /<script id="scentory-ldjson" type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script id="scentory-ldjson" type="application/ld+json">\n${schemaJson}\n    </script>`
  );

  return output;
}

module.exports = {
  escapeXml,
  generateProductSchema,
  injectProductMeta
};
