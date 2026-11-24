const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const videoStorage = multer.memoryStorage();
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

// Apply admin guard to all routes in this router
router.use(authenticateToken, requireAdmin);

// Dashboard summary stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const products = db.getProducts();
    const orders = db.getOrders();
    const users = db.getUsers();

    // Calculate revenue
    let totalRevenue = 0;
    let pendingVerificationCount = 0;
    let pendingFulfillmentCount = 0;

    orders.forEach(o => {
      if (o.paymentStatus === 'verified') {
        totalRevenue += Number(o.finalTotal || 0);
      }
      if (o.paymentStatus === 'pending_verification') {
        pendingVerificationCount++;
      }
      if (o.orderStatus === 'placed' || o.orderStatus === 'processing') {
        pendingFulfillmentCount++;
      }
    });

    // Low stock items (stock <= 10)
    const lowStockAlerts = [];
    products.forEach(p => {
      (p.variants || []).forEach(v => {
        if (v.stock <= 10) {
          lowStockAlerts.push({
            productId: p.id,
            productName: p.name,
            variantSize: v.size,
            sku: v.sku,
            currentStock: v.stock
          });
        }
      });
    });

    // Top selling fragrances
    const topProducts = [...products]
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        scentFamily: p.scentFamily,
        salesCount: p.salesCount || 0,
        image: p.images?.[0]
      }));

    res.json({
      totalRevenue,
      totalOrders: orders.length,
      pendingVerificationCount,
      pendingFulfillmentCount,
      totalProducts: products.length,
      totalCustomers: users.filter(u => u.role === 'customer').length,
      lowStockAlerts,
      topProducts,
      recentOrders: orders.slice(0, 5)
    });
  } catch (err) {
    console.error('Error generating dashboard stats:', err);
    res.status(500).json({ message: 'Failed to generate dashboard analytics.' });
  }
});

// Sales Reports & Export
router.get('/reports', async (req, res) => {
  try {
    const orders = db.getOrders();
    const products = db.getProducts();

    // Group sales by day/month
    const salesByDate = {};
    orders.forEach(o => {
      const dateKey = o.createdAt.split('T')[0];
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { date: dateKey, total: 0, count: 0 };
      }
      if (o.paymentStatus === 'verified') {
        salesByDate[dateKey].total += Number(o.finalTotal || 0);
      }
      salesByDate[dateKey].count += 1;
    });

    // Breakdown by product
    const productSalesMap = {};
    orders.forEach(o => {
      if (o.paymentStatus === 'verified') {
        o.items.forEach(item => {
          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              totalUnits: 0,
              totalRevenue: 0
            };
          }
          productSalesMap[item.productId].totalUnits += item.quantity;
          productSalesMap[item.productId].totalRevenue += item.subtotal;
        });
      }
    });

    res.json({
      dailySales: Object.values(salesByDate).slice(-30),
      productBreakdown: Object.values(productSalesMap)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate sales report.' });
  }
});

// ==========================================
// CUSTOMER MANAGEMENT & MEMBERSHIP
// ==========================================

// Get all customer users with order counts & total spent
router.get('/users', async (req, res) => {
  try {
    const users = db.getUsers();
    const orders = db.getOrders();

    const customerMap = new Map();

    // 1. Add all registered users
    users.forEach(u => {
      const key = (u.email || '').toLowerCase().trim() || u.id;
      customerMap.set(key, { ...u });
    });

    // 2. Add any customer details from orders
    orders.forEach(o => {
      const c = o.customerDetails;
      if (c) {
        const key = (c.email || '').toLowerCase().trim() || (c.phone || '').trim();
        if (key && !customerMap.has(key)) {
          customerMap.set(key, {
            id: o.userId || ('cust_' + Math.random().toString(36).substring(2, 7)),
            name: c.name || 'Customer',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            role: 'customer',
            createdAt: o.createdAt
          });
        }
      }
    });

    const customerList = Array.from(customerMap.values()).map(u => {
      const userOrders = orders.filter(o => 
        o.userId === u.id || 
        (u.email && o.customerDetails?.email && o.customerDetails.email.toLowerCase().trim() === u.email.toLowerCase().trim()) ||
        (u.phone && o.customerDetails?.phone && o.customerDetails.phone.trim() === u.phone.trim())
      );
      const verifiedSpent = userOrders
        .filter(o => o.paymentStatus === 'verified')
        .reduce((sum, o) => sum + (Number(o.finalTotal) || Number(o.totalAmount) || 0), 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        address: u.address || '',
        city: u.city || '',
        role: u.role || 'customer',
        isPremium: !!u.isPremium,
        membershipTier: u.membershipTier || (u.isPremium ? 'VIP Premium Member' : 'Standard Member'),
        totalOrders: userOrders.length,
        totalSpent: verifiedSpent,
        createdAt: u.createdAt || new Date().toISOString()
      };
    });

    res.json(customerList);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ message: 'Failed to fetch customer users.' });
  }
});

// Toggle Premium Member status
router.patch('/users/:id/toggle-premium', async (req, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const newPremium = !user.isPremium;
    const updated = await db.updateUser(user.id, {
      isPremium: newPremium,
      membershipTier: newPremium ? 'VIP Premium Member' : 'Standard Member'
    });

    res.json({
      message: newPremium ? `✨ ${updated.name} has been elevated to VIP Premium Member!` : `${updated.name} updated to Standard Member.`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        isPremium: updated.isPremium,
        membershipTier: updated.membershipTier
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle premium membership.' });
  }
});

// Admin Reset Password for customer
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateUser(user.id, { password: hashedPassword });

    res.json({ message: `Password successfully reset for ${user.name} (${user.email}).` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset customer password.' });
  }
});

// Delete customer account
router.delete('/users/:id', async (req, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted here.' });
    }

    await db.deleteUser(user.id);
    res.json({ message: `Customer account ${user.name} (${user.email}) deleted.` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete customer.' });
  }
});

// GET active password reset verification requests
router.get('/reset-requests', async (req, res) => {
  try {
    const requests = db.getPasswordResetRequests();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get reset requests.' });
  }
});

// Upload commercial hero video file
router.post('/upload-video', videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file provided.' });
    const filename = 'hero-uploaded-video.mp4';
    const publicPath = path.join(__dirname, '..', '..', 'client', 'public', filename);
    const serverPath = path.join(__dirname, '..', 'uploads', filename);

    fs.writeFileSync(publicPath, req.file.buffer);
    try { fs.writeFileSync(serverPath, req.file.buffer); } catch (e) {}

    const videoUrl = '/' + filename;
    await db.updateSettings({ heroVideoUrl: videoUrl });

    res.json({ message: 'Video uploaded successfully!', videoUrl });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ message: 'Failed to upload video file.' });
  }
});

module.exports = router;
