const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Setup multer for bank slip / payment proof uploads
const receiptDir = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(receiptDir)) {
  try {
  fs.mkdirSync(receiptDir, { recursive: true });
  } catch (err) { /* serverless read-only filesystem */ }
}

// Create a dummy sample slip image if none exists so seed orders have valid preview
const sampleSlipPath = path.join(receiptDir, 'sample-slip-demo.jpg');
if (!fs.existsSync(sampleSlipPath)) {
  try {
    // Copy brand logo or placeholder as sample
    const brandLogo = path.join(__dirname, '..', 'brand-logo.png');
    if (fs.existsSync(brandLogo)) {
      fs.copyFileSync(brandLogo, sampleSlipPath);
    }
  } catch (e) {
    // non-fatal
  }
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' || ext === '.pdf') {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WEBP) or PDF are allowed for bank slips.'));
  }
});

// Upload bank slip endpoint
router.post('/upload-slip', authenticateToken, upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No receipt file provided.' });
  }
  const mime = req.file.mimetype || 'image/jpeg';
  const base64 = req.file.buffer.toString('base64');
  const slipUrl = `data:${mime};base64,${base64}`;

  // Also attempt saving to disk if writable
  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = `slip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
  try {
    fs.writeFileSync(path.join(receiptDir, filename), req.file.buffer);
  } catch (e) {}

  res.json({ slipUrl, filename });
});

// CREATE Order (Customer must be authenticated)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      customerDetails,
      items,
      bankSlipUrl,
      notes,
      fulfillmentType
    } = req.body;

    // Validate customer details
    if (!customerDetails || !customerDetails.name || !customerDetails.phone || !customerDetails.address) {
      return res.status(400).json({
        message: 'Please complete all customer details: Name, WhatsApp number, and Delivery / Pick Up address.'
      });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Your shopping cart is empty.' });
    }

    // MANDATORY REQUIREMENT: Bank slip must be uploaded
    if (!bankSlipUrl) {
      return res.status(400).json({
        message: 'Payment slip is required. Please upload the bank transfer receipt/screenshot to proceed.'
      });
    }

    const settings = db.getSettings();

    // Calculate subtotal
    let subtotal = 0;
    const validatedItems = items.map(item => {
      const lineTotal = Number(item.price) * Number(item.quantity);
      subtotal += lineTotal;
      return {
        productId: item.productId,
        productName: item.productName,
        image: item.image,
        variantId: item.variantId,
        variantSize: item.variantSize,
        price: Number(item.price),
        quantity: Number(item.quantity),
        subtotal: lineTotal
      };
    });

    const isPickup = fulfillmentType === 'pickup';
    const deliveryFee = isPickup ? 0 : (settings.deliveryFee !== undefined ? Number(settings.deliveryFee) : 500);
    const finalTotal = subtotal + deliveryFee;

    const orderId = 'SCNT-' + Math.floor(1000 + Math.random() * 9000);

    const newOrder = {
      id: orderId,
      userId: req.user.id,
      customerDetails: {
        name: customerDetails.name.trim(),
        email: (customerDetails.email || req.user.email).trim(),
        phone: customerDetails.phone.trim(), // WhatsApp number
        address: customerDetails.address.trim(),
        city: (customerDetails.city || '').trim(),
        postalCode: (customerDetails.postalCode || '').trim(),
        notes: (notes || customerDetails.notes || '').trim()
      },
      items: validatedItems,
      fulfillmentType: isPickup ? 'pickup' : 'delivery',
      subtotal,
      deliveryFee,
      finalTotal,
      paymentMethod: 'bank_transfer',
      bankSlipUrl: bankSlipUrl.trim(),
      paymentStatus: 'pending_verification',
      orderStatus: 'placed',
      bankDetailsSnap: settings.bankDetails || {
        bankName: 'Commercial Bank of Ceylon',
        accountName: 'SCENTORY LANKA (PVT) LTD',
        accountNumber: '8012398456',
        branch: 'Kollupitiya Branch'
      },
      adminNotes: '',
      createdAt: new Date().toISOString()
    };

    await db.addOrder(newOrder);

    // Automatically trigger notification for Admin Panel
    await db.addNotification({
      id: 'notif_' + Date.now(),
      type: 'order',
      title: `📦 New Order #${newOrder.id}`,
      message: `${newOrder.customerDetails?.name || 'Customer'} placed order for Rs. ${newOrder.finalTotal?.toLocaleString()} (Deposit slip uploaded)`,
      dataId: newOrder.id,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Order placed successfully! We will verify your bank slip shortly.',
      order: newOrder
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Order submission failed.' });
  }
});

// GET My Orders (Logged in customer)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const userOrders = db.getUserOrders(req.user.id, req.user.email);
    res.json(userOrders);
  } catch (err) {
    console.error('Error fetching my-orders:', err);
    res.status(500).json({ message: 'Failed to retrieve your order history.' });
  }
});

// GET Single Order
router.get('/:id', authenticateToken, async (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  // Ensure customer can only view their own order unless admin
  if (req.user.role !== 'admin' && order.userId !== req.user.id) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  res.json(order);
});

// ADMIN: Get All Orders
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = db.getOrders();
    const { status, paymentStatus, search } = req.query;

    let filtered = [...orders];

    if (status && status !== 'all') {
      filtered = filtered.filter(o => o.orderStatus === status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filtered = filtered.filter(o => o.paymentStatus === paymentStatus);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customerDetails.name.toLowerCase().includes(q) ||
        o.customerDetails.phone.includes(q) ||
        o.customerDetails.email.toLowerCase().includes(q)
      );
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load store orders.' });
  }
});

// ADMIN: Update Order Status & Payment Verification
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { orderStatus, paymentStatus, adminNotes } = req.body;
    const existing = db.getOrderById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const updates = {};
    if (orderStatus) updates.orderStatus = orderStatus;
    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
      // Auto-decrement inventory stock and increment sales count when verified
      if (paymentStatus === 'verified' && existing.paymentStatus !== 'verified') {
        for (const item of (existing.items || [])) {
          const product = db.getProductById(item.productId);
          if (product && Array.isArray(product.variants)) {
            const vIdx = product.variants.findIndex(v => v.id === item.variantId || v.size === item.variantSize);
            if (vIdx !== -1) {
              product.variants[vIdx].stock = Math.max(0, (Number(product.variants[vIdx].stock) || 0) - (Number(item.quantity) || 1));
            }
            product.salesCount = (Number(product.salesCount) || 0) + (Number(item.quantity) || 1);
            await db.updateProduct(product.id, { variants: product.variants, salesCount: product.salesCount });
          }
        }
      }
    }
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    const updated = await db.updateOrder(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order status.' });
  }
});

// ADMIN: Delete Order (Permanently remove fake/spam/cancelled order)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const deleted = await db.deleteOrder(orderId);
    res.json({ message: `Order ${orderId} deleted permanently.`, deleted: true, order: deleted });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ message: 'Failed to delete order.' });
  }
});

module.exports = router;
