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
    if (!customerDetails || !customerDetails.name?.trim() || !customerDetails.phone?.trim() || !customerDetails.address?.trim()) {
      return res.status(400).json({
        message: 'Please complete all customer details: Full Name, WhatsApp phone number, and Delivery / Pick Up address.'
      });
    }

    // Sri Lanka phone validation
    const cleanPhone = customerDetails.phone.trim().replace(/[\s\-()]/g, '');
    const slPhoneRegex = /^(?:0|94|\+94)?(7[0-9]{8})$/;
    if (!slPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        message: 'Please enter a valid 10-digit Sri Lankan phone/WhatsApp number (e.g. 0771234567 or +94771234567).'
      });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Your shopping cart is empty.' });
    }

    // MANDATORY REQUIREMENT: Bank slip must be uploaded
    if (!bankSlipUrl || typeof bankSlipUrl !== 'string' || !bankSlipUrl.trim()) {
      return res.status(400).json({
        message: 'Payment slip is required. Please upload the bank transfer receipt/screenshot to proceed.'
      });
    }

    const settings = db.getSettings();

    // SERVER-AUTHORITATIVE Price and Stock Validation (Never trust prices sent from browser)
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({ message: 'Invalid item: missing product identifier.' });
      }

      const product = db.getProductById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product "${item.productName || item.productId}" is no longer available in store.` });
      }

      const variants = product.variants || [];
      const variant = variants.find(v => v.id === item.variantId || v.size === item.variantSize);
      if (!variant) {
        return res.status(400).json({ message: `Selected variant for "${product.name}" is no longer available.` });
      }

      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: `Invalid quantity for "${product.name}". Must be at least 1.` });
      }

      if ((Number(variant.stock) || 0) < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name} - ${variant.size}". Available: ${variant.stock}, requested: ${quantity}.`
        });
      }

      // Authoritative unit price directly from database
      const unitPrice = variant.discountPrice !== undefined && variant.discountPrice !== null && Number(variant.discountPrice) > 0
        ? Number(variant.discountPrice)
        : Number(variant.price);

      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        image: product.images?.[0] || item.image || '/brand-logo.png',
        variantId: variant.id,
        variantSize: variant.size,
        sku: variant.sku || '',
        price: unitPrice,
        quantity: quantity,
        subtotal: lineTotal
      });
    }

    const isPickup = fulfillmentType === 'pickup';
    const freeThreshold = Number(settings.freeShippingThreshold || settings.freeDeliveryThreshold || 999999999);
    const standardFee = Number(settings.deliveryFee || settings.shippingFee || 500);
    const deliveryFee = isPickup ? 0 : (subtotal >= freeThreshold ? 0 : standardFee);

    // Compute promotional deal discount (e.g. Buy X Get Y Free)
    let serverDealDiscount = 0;
    const deal = settings.promotionalDeal;
    if (deal && deal.enabled) {
      const buyQty = Math.max(1, parseInt(deal.buyQty, 10) || 2);
      const freeQty = Math.max(1, parseInt(deal.freeQty, 10) || 1);
      const groupSize = buyQty + freeQty;
      const totalUnits = validatedItems.reduce((acc, it) => acc + it.quantity, 0);

      if (totalUnits >= groupSize) {
        const eligibleGroups = Math.floor(totalUnits / groupSize);
        const freeCount = eligibleGroups * freeQty;

        const unitPrices = [];
        validatedItems.forEach(it => {
          for (let i = 0; i < it.quantity; i++) {
            unitPrices.push(Number(it.price) || 0);
          }
        });
        unitPrices.sort((a, b) => a - b);

        for (let i = 0; i < Math.min(freeCount, unitPrices.length); i++) {
          serverDealDiscount += unitPrices[i];
        }
      }
    }

    const finalTotal = Math.max(0, subtotal - serverDealDiscount) + deliveryFee;

    // Collision-resistant unique Order ID (e.g. SCNT-K8Z2-3F9A)
    const timeCode = Date.now().toString(36).toUpperCase().slice(-4);
    const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `SCNT-${timeCode}-${randCode}`;

    const newOrder = {
      id: orderId,
      userId: req.user.id,
      customerDetails: {
        name: customerDetails.name.trim(),
        email: (customerDetails.email || req.user.email).trim().toLowerCase(),
        phone: cleanPhone,
        address: customerDetails.address.trim(),
        city: (customerDetails.city || '').trim(),
        postalCode: (customerDetails.postalCode || '').trim(),
        notes: (notes || customerDetails.notes || '').trim()
      },
      items: validatedItems,
      fulfillmentType: isPickup ? 'pickup' : 'delivery',
      subtotal,
      dealDiscount: serverDealDiscount,
      dealTitle: deal && deal.enabled ? deal.title : '',
      deliveryFee,
      finalTotal,
      paymentMethod: 'bank_transfer',
      bankSlipUrl: bankSlipUrl.trim(),
      paymentStatus: 'pending_verification',
      orderStatus: 'placed',
      stockDeducted: false,
      bankDetailsSnap: settings.bankDetails || {
        bankName: 'Commercial Bank',
        accountName: 'S M Suhail',
        accountNumber: '8021353334',
        branch: 'Gampola Branch'
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
    res.status(500).json({ message: 'Failed to place order: ' + err.message });
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

    const ALLOWED_PAYMENT_STATUSES = ['pending_verification', 'verified', 'rejected', 'refunded'];
    const ALLOWED_ORDER_STATUSES = ['placed', 'processing', 'dispatched', 'delivered', 'cancelled'];

    if (paymentStatus && !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: `Invalid payment status "${paymentStatus}". Allowed: ${ALLOWED_PAYMENT_STATUSES.join(', ')}` });
    }
    if (orderStatus && !ALLOWED_ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ message: `Invalid order status "${orderStatus}". Allowed: ${ALLOWED_ORDER_STATUSES.join(', ')}` });
    }

    const updates = {};
    if (orderStatus) updates.orderStatus = orderStatus;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;

      // Idempotent inventory deduction: only deduct if transitioning to verified and not previously deducted
      if (paymentStatus === 'verified' && !existing.stockDeducted) {
        for (const item of (existing.items || [])) {
          const product = db.getProductById(item.productId);
          if (product && Array.isArray(product.variants)) {
            const vIdx = product.variants.findIndex(v => v.id === item.variantId || v.size === item.variantSize);
            if (vIdx !== -1) {
              const currentStock = Number(product.variants[vIdx].stock) || 0;
              const qty = Number(item.quantity) || 1;
              product.variants[vIdx].stock = Math.max(0, currentStock - qty);
              await db.updateProduct(product.id, { variants: product.variants });
            }
          }
        }
        updates.stockDeducted = true;
      } else if (paymentStatus !== 'verified' && existing.stockDeducted) {
        // Payment status reversed, rejected, or refunded: restore inventory
        for (const item of (existing.items || [])) {
          const product = db.getProductById(item.productId);
          if (product && Array.isArray(product.variants)) {
            const vIdx = product.variants.findIndex(v => v.id === item.variantId || v.size === item.variantSize);
            if (vIdx !== -1) {
              const currentStock = Number(product.variants[vIdx].stock) || 0;
              const qty = Number(item.quantity) || 1;
              product.variants[vIdx].stock = currentStock + qty;
              await db.updateProduct(product.id, { variants: product.variants });
            }
          }
        }
        updates.stockDeducted = false;
      }
    }

    const updated = await db.updateOrder(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Failed to update order status: ' + err.message });
  }
});

// ADMIN: Delete Order (Permanently remove fake/spam/cancelled order)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const existing = db.getOrderById(orderId);
    if (!existing) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // If stock was already deducted for this order, restore stock before deleting
    if (existing.stockDeducted && Array.isArray(existing.items)) {
      for (const item of existing.items) {
        const product = db.getProductById(item.productId);
        if (product && Array.isArray(product.variants)) {
          const vIdx = product.variants.findIndex(v => v.id === item.variantId || v.size === item.variantSize);
          if (vIdx !== -1) {
            const currentStock = Number(product.variants[vIdx].stock) || 0;
            const qty = Number(item.quantity) || 1;
            product.variants[vIdx].stock = currentStock + qty;
            await db.updateProduct(product.id, { variants: product.variants });
          }
        }
      }
    }

    const deleted = await db.deleteOrder(orderId);
    res.json({ message: `Order ${orderId} deleted permanently.`, deleted: true, order: deleted });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ message: 'Failed to delete order: ' + err.message });
  }
});

module.exports = router;
