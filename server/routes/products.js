const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Setup multer for product image uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  try {
  fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) { /* serverless read-only filesystem */ }
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|avif/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WEBP, AVIF) are allowed.'));
  }
});

// Image upload helper endpoint
router.post('/upload-image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }
  const mime = req.file.mimetype || 'image/jpeg';
  const base64 = req.file.buffer.toString('base64');
  const imageUrl = `data:${mime};base64,${base64}`;

  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = `product-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
  try {
    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
  } catch (e) {}

  res.json({ imageUrl, filename });
});

// GET all products with filtering & search
router.get('/', async (req, res) => {
  try {
    let products = db.getProducts();
    const { search, category, gender, featured, trending, minPrice, maxPrice, sort } = req.query;

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.tagline && p.tagline.toLowerCase().includes(q)) ||
        (p.scentFamily && p.scentFamily.toLowerCase().includes(q)) ||
        (p.notes && (
          (p.notes.top || []).some(n => n.toLowerCase().includes(q)) ||
          (p.notes.heart || []).some(n => n.toLowerCase().includes(q)) ||
          (p.notes.base || []).some(n => n.toLowerCase().includes(q))
        ))
      );
    }

    if (category && category !== 'all') {
      products = products.filter(p => p.scentFamily && p.scentFamily.toLowerCase().includes(category.toLowerCase()));
    }

    if (gender && gender !== 'all') {
      products = products.filter(p => p.gender && p.gender.toLowerCase() === gender.toLowerCase());
    }

    if (featured === 'true') {
      products = products.filter(p => p.isFeatured === true);
    }

    // Min / Max price filter based on lowest variant price
    if (minPrice || maxPrice) {
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Infinity;
      products = products.filter(p => {
        const lowestPrice = Math.min(...(p.variants || []).map(v => v.discountPrice || v.price));
        return lowestPrice >= min && lowestPrice <= max;
      });
    }

    // Sorting
    if (sort === 'trending') {
      products.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    } else if (sort === 'price-low') {
      products.sort((a, b) => {
        const aMin = Math.min(...(a.variants || []).map(v => v.discountPrice || v.price));
        const bMin = Math.min(...(b.variants || []).map(v => v.discountPrice || v.price));
        return aMin - bMin;
      });
    } else if (sort === 'price-high') {
      products.sort((a, b) => {
        const aMax = Math.max(...(a.variants || []).map(v => v.discountPrice || v.price));
        const bMax = Math.max(...(b.variants || []).map(v => v.discountPrice || v.price));
        return bMax - aMax;
      });
    } else if (sort === 'newest') {
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Failed to fetch fragrance catalogue.' });
  }
});

// GET Trending products (calculated from highest sales count or flagged)
router.get('/trending', async (req, res) => {
  try {
    const products = db.getProducts();
    const sorted = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    res.json(sorted.slice(0, 4));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching trending fragrances.' });
  }
});

// GET Featured products
router.get('/featured', async (req, res) => {
  try {
    const products = db.getProducts().filter(p => p.isFeatured);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching featured fragrances.' });
  }
});

// GET Single product
router.get('/:id', async (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Fragrance not found.' });
  }
  res.json(product);
});

// ADMIN: Create Product
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      tagline,
      description,
      gender,
      scentFamily,
      isFeatured,
      badge,
      notes,
      images,
      variants
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Product title is required.' });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ message: 'At least one bottle size variant (e.g. 5ml, 10ml, 50ml) is required.' });
    }

    // Format variants with unique ids
    const formattedVariants = variants.map((v, idx) => ({
      id: v.id || `var_${Date.now()}_${idx}`,
      size: v.size || '10ml Spray',
      price: Number(v.price) || 0,
      discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
      stock: v.stock !== undefined ? Number(v.stock) : 20,
      sku: v.sku || `SKU-${Date.now().toString(36).toUpperCase()}-${idx}`
    }));

    const newProduct = {
      id: 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      tagline: tagline ? tagline.trim() : 'Extrait De Parfum',
      description: description ? description.trim() : '',
      gender: gender || 'unisex',
      scentFamily: scentFamily || 'Oriental',
      isFeatured: Boolean(isFeatured),
      badge: badge ? badge.trim() : '',
      salesCount: 0,
      notes: notes || { top: [], heart: [], base: [] },
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80'],
      variants: formattedVariants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.addProduct(newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Failed to create product.' });
  }
});

// ADMIN: Update Product
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const existing = db.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Fragrance not found.' });
    }

    const {
      name,
      tagline,
      description,
      gender,
      scentFamily,
      isFeatured,
      badge,
      notes,
      images,
      variants,
      salesCount
    } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (tagline !== undefined) updates.tagline = tagline.trim();
    if (description !== undefined) updates.description = description.trim();
    if (gender !== undefined) updates.gender = gender;
    if (scentFamily !== undefined) updates.scentFamily = scentFamily;
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    if (badge !== undefined) updates.badge = badge.trim();
    if (notes !== undefined) updates.notes = notes;
    if (images !== undefined) updates.images = images;
    if (salesCount !== undefined) updates.salesCount = Number(salesCount);

    if (variants && Array.isArray(variants)) {
      updates.variants = variants.map((v, idx) => ({
        id: v.id || `var_${Date.now()}_${idx}`,
        size: v.size || '10ml Spray',
        price: Number(v.price) || 0,
        discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
        stock: v.stock !== undefined ? Number(v.stock) : 10,
        sku: v.sku || `SKU-${idx}`
      }));
    }

    const updated = await db.updateProduct(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Failed to update product.' });
  }
});

// ADMIN: Delete Product
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const removed = await db.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted successfully.', product: removed });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Failed to delete product.' });
  }
});

// ADMIN: Quick Stock Update
router.patch('/:id/stock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { variantId, stock } = req.body;
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const variants = [...(product.variants || [])];
    const targetVariant = variants.find(v => v.id === variantId);
    if (!targetVariant) {
      return res.status(404).json({ message: 'Variant not found.' });
    }

    targetVariant.stock = Number(stock);
    const updated = await db.updateProduct(req.params.id, { variants });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update stock.' });
  }
});

module.exports = router;
