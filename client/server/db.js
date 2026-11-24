const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let Pool = null;
let Client = null;
try {
  const pg = require('pg');
  Pool = pg.Pool;
  Client = pg.Client;
} catch (e) {}

const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Ensure data folder exists
try {
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  }
} catch (e) {}

function getInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);

  return {
    settings: {
      storeName: 'SCENTORY.LK',
      brandSubtitle: 'A New Destination for Your Signature Scent',
      currency: 'LKR',
      currencySymbol: 'Rs. ',
      contactEmail: 'orders@scentory.lk',
      contactPhone: '0763151311',
      whatsappNumber: '0763151311',
      instagramHandle: '@scentory.lk',
      instagramUrl: 'https://www.instagram.com/scentory.lk',
      address: '313, Nawalapitiya Road, Ulapane, Sri Lanka',
      deliveryFee: 500,
      freeDeliveryThreshold: 999999999,
      bankDetails: {
        bankName: 'Commercial Bank of Ceylon',
        accountName: 'SCENTORY LANKA (PVT) LTD',
        accountNumber: '8012398456',
        branch: 'Kollupitiya Branch (Code: 045)',
        swiftCode: 'CCEYLKX',
        instructions: 'Please transfer the exact total amount and use your name or phone number as the payment reference. Upload the screenshot/receipt slip below.'
      },
      heroBadge: "WE'RE LIVE • SCENTORY.LK",
      heroTitle: "A New Destination For Your",
      heroSubtitle: "Signature Scent.",
      heroDescription: "Discover artisan extrait de parfum, opulent royal ouds, and custom-decanted atomizers (10ml, 20ml, 50ml, 100ml). Curated exclusively for Sri Lanka’s fragrance lovers with verified bank transfer ordering.",
      heroVideoUrl: '/hero-perfume-video.mp4',
      heroVideoFit: 'contain',
      heroVideoAspect: 'auto',
      heroVideoHeight: 540,
      shopBadge: 'Exclusive Fragrance Collection',
      shopTitle: 'Distinguished Scents For Every Occasion',
      shopDescription: 'Available in precision travel decants (10ml, 20ml) and full flacons (50ml, 100ml). All prices in Sri Lankan Rupees (LKR).',
      announcement: '✨ Free Island-wide Delivery on orders above Rs. 12,000 | Authentic Luxury Decants & Flacons'
    },
    users: [
      {
        id: 'usr_admin',
        name: 'Store Administrator',
        email: 'admin@scentory.lk',
        password: adminPasswordHash,
        role: 'admin',
        phone: '0763151311',
        address: 'SCENTORY Flagship Studio, Ulapane',
        city: 'Kandy',
        createdAt: new Date().toISOString()
      }
    ],
    products: [],
    orders: [],
    reviews: [],
    notifications: [],
    chatMessages: [],
    passwordResetRequests: []
  };
}

class Database {
  constructor() {
    this.pgPool = null;
    this.connectPromise = null;
    this.lastSyncTime = 0;
    this.isSyncing = false;
    this.init();
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || 'postgresql://postgres.ipvlpxykoyyzketgtybb:Scentary2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
    if (Pool && dbUrl) {
      this.initPg(dbUrl);
    }
  }

  initPg(connectionString) {
    try {
      this.pgPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      this.pgPool.on('error', (err) => {
        console.error('Supabase pool idle client error:', err.message);
      });

      this.connectPromise = this.syncFromSupabase();
    } catch (err) {
      console.error('Failed to init Supabase pool:', err.message);
    }
  }

  async syncFromSupabase() {
    if (!this.pgPool || this.isSyncing) return;
    this.isSyncing = true;
    try {
      await this.pgPool.query('CREATE TABLE IF NOT EXISTS store_data (id VARCHAR(50) PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());');
      const res = await this.pgPool.query('SELECT data FROM store_data WHERE id = $1', ['main_store_data']);
      if (res.rows && res.rows.length > 0 && res.rows[0].data) {
        const remote = res.rows[0].data;
        const initial = getInitialData();
        this.data = {
          ...initial,
          ...remote,
          settings: {
            ...initial.settings,
            ...(remote.settings || {})
          },
          products: Array.isArray(remote.products) ? remote.products : [],
          users: Array.isArray(remote.users) && remote.users.length > 0 ? remote.users : initial.users,
          orders: Array.isArray(remote.orders) ? remote.orders : [],
          reviews: Array.isArray(remote.reviews) ? remote.reviews : [],
          notifications: Array.isArray(remote.notifications) ? remote.notifications : [],
          chatMessages: Array.isArray(remote.chatMessages) ? remote.chatMessages : [],
          passwordResetRequests: Array.isArray(remote.passwordResetRequests) ? remote.passwordResetRequests : []
        };
        this.lastSyncTime = Date.now();
      } else {
        await this.pgPool.query('INSERT INTO store_data (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW();', ['main_store_data', JSON.stringify(this.data)]);
        this.lastSyncTime = Date.now();
      }
    } catch (err) {
      console.error('Supabase sync error:', err.message);
    } finally {
      this.isSyncing = false;
    }
  }

  // Ensures Supabase is connected and initially synced before processing API requests
  async ensureConnected() {
    if (!this.pgPool) {
      const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || 'postgresql://postgres.ipvlpxykoyyzketgtybb:Scentary2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
      if (Pool && dbUrl) this.initPg(dbUrl);
    }

    if (this.lastSyncTime === 0 && this.connectPromise) {
      try {
        await this.connectPromise;
      } catch (e) {
        console.error('Initial Supabase wait failed:', e.message);
      }
    } else if (Date.now() - this.lastSyncTime > 5000 && !this.isSyncing) {
      this.syncFromSupabase().catch(() => {});
    }
  }

  init() {
    try {
      if (!fs.existsSync(DB_PATH)) {
        const initial = getInitialData();
        try { fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8'); } catch (e) {}
        this.data = initial;
      } else {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch (err) {
      this.data = getInitialData();
    }
  }

  async save() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8'); } catch (e) {}
    this.lastSyncTime = Date.now();
    if (!this.pgPool) {
      const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || 'postgresql://postgres.ipvlpxykoyyzketgtybb:Scentary2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
      if (Pool && dbUrl) this.initPg(dbUrl);
    }
    if (this.pgPool) {
      try {
        await this.pgPool.query('INSERT INTO store_data (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW();', ['main_store_data', JSON.stringify(this.data)]);
      } catch (err) {
        console.error('Supabase save error:', err.message);
      }
    }
  }

  // Users
  getUsers() { return this.data.users || []; }
  getUserById(id) { return this.getUsers().find(u => u.id === id); }
  getUserByEmail(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); }
  async addUser(user) {
    this.data.users.push(user);
    await this.save();
    return user;
  }
  async updateUser(id, updates) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      await this.save();
      return this.data.users[idx];
    }
    return null;
  }
  async deleteUser(id) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const removed = this.data.users.splice(idx, 1)[0];
      await this.save();
      return removed;
    }
    return null;
  }

  // Products
  getProducts() { return this.data.products || []; }
  getProductById(id) { return this.getProducts().find(p => p.id === id); }
  async addProduct(product) {
    this.data.products.unshift(product);
    await this.save();
    return product;
  }
  async updateProduct(id, updates) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...updates, updatedAt: new Date().toISOString() };
      await this.save();
      return this.data.products[idx];
    }
    return null;
  }
  async deleteProduct(id) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const removed = this.data.products.splice(idx, 1);
      await this.save();
      return removed[0];
    }
    // If not found in current array, ensure it is saved clean
    await this.save();
    return { id, deleted: true };
  }

  // Orders
  getOrders() { return this.data.orders || []; }
  getOrderById(id) {
    const target = String(id || '').trim().toLowerCase();
    return this.getOrders().find(o => String(o.id || '').trim().toLowerCase() === target);
  }
  getUserOrders(userId, email) {
    const list = this.getOrders();
    const cleanId = String(userId || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    return list.filter(o => {
      if (cleanId && o.userId === cleanId) return true;
      const oEmail = (o.customerDetails?.email || o.email || '').trim().toLowerCase();
      if (cleanEmail && oEmail === cleanEmail) return true;
      return false;
    });
  }
  getOrdersByUserId(userId, email) {
    return this.getUserOrders(userId, email);
  }
  async addOrder(orderData) {
    const order = {
      id: 'SCNT-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      orderStatus: 'pending',
      paymentStatus: 'pending_verification',
      ...orderData
    };
    this.data.orders.unshift(order);
    await this.addNotification({
      type: 'new_order',
      title: 'New Bank Transfer Order',
      message: 'New bank transfer order placed. Verify deposit slip.',
      orderId: order.id,
      timestamp: new Date().toISOString()
    });
    await this.save();
    return order;
  }
  async updateOrder(id, updates) {
    const target = String(id || '').trim().toLowerCase();
    const idx = this.data.orders.findIndex(o => String(o.id || '').trim().toLowerCase() === target);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates };
      await this.save();
      return this.data.orders[idx];
    }
    return null;
  }
  async deleteOrder(id) {
    const target = String(id || '').trim().toLowerCase();
    const idx = this.data.orders.findIndex(o => String(o.id || '').trim().toLowerCase() === target);
    if (idx !== -1) {
      const removed = this.data.orders.splice(idx, 1);
      await this.save();
      return removed[0];
    }
    return null;
  }

  // Reviews
  getReviews() { return this.data.reviews || []; }
  async addReview(reviewData) {
    const review = {
      id: 'rev_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...reviewData
    };
    if (!this.data.reviews) this.data.reviews = [];
    this.data.reviews.unshift(review);
    await this.save();
    return review;
  }
  async deleteReview(id) {
    if (!this.data.reviews) return null;
    const idx = this.data.reviews.findIndex(r => r.id === id);
    if (idx !== -1) {
      const removed = this.data.reviews.splice(idx, 1);
      await this.save();
      return removed[0];
    }
    return null;
  }

  // Settings
  getSettings() { return this.data.settings || {}; }
  async updateSettings(updates) {
    if (updates && updates.heroVideoUrl && updates.heroVideoUrl.startsWith('data:video/')) {
      try {
        const matches = updates.heroVideoUrl.match(/^data:video\/\w+;base64,(.+)$/);
        if (matches) {
          const videoBuf = Buffer.from(matches[1], 'base64');
          const videoName = 'hero-uploaded-video.mp4';
          const p1 = path.join(__dirname, '..', 'client', 'public', videoName);
          const p2 = path.join(__dirname, 'uploads', videoName);
          fs.writeFileSync(p1, videoBuf);
          try { fs.writeFileSync(p2, videoBuf); } catch(e) {}
          updates.heroVideoUrl = '/' + videoName;
        }
      } catch (e) {
        console.error('Video extraction error:', e);
      }
    }
    this.data.settings = { ...this.data.settings, ...updates };
    await this.save();
    return this.data.settings;
  }

  // Chat
  getChatMessages() { return this.data.chatMessages || []; }
  async addChatMessage(msg) {
    if (!this.data.chatMessages) this.data.chatMessages = [];
    this.data.chatMessages.unshift(msg);
    await this.save();
    return msg;
  }
  async deleteChatMessage(id) {
    if (!this.data.chatMessages) return null;
    const idx = this.data.chatMessages.findIndex(m => m.id === id);
    if (idx !== -1) {
      const removed = this.data.chatMessages.splice(idx, 1);
      await this.save();
      return removed[0];
    }
    return null;
  }

  // Notifications
  getNotifications() { return this.data.notifications || []; }
  async addNotification(notif) {
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.unshift({
      id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 6),
      read: false,
      ...notif
    });
    if (this.data.notifications.length > 100) {
      this.data.notifications = this.data.notifications.slice(0, 100);
    }
    await this.save();
    return notif;
  }
  async markAllNotificationsRead() {
    if (!this.data.notifications) return [];
    this.data.notifications.forEach(n => { n.read = true; });
    await this.save();
    return this.data.notifications;
  }
  async markNotificationRead(id) {
    if (!this.data.notifications) return null;
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      await this.save();
      return notif;
    }
    return null;
  }
  async clearAllNotifications() {
    this.data.notifications = [];
    await this.save();
    return [];
  }
  async deleteNotification(id) {
    if (!this.data.notifications) return null;
    const idx = this.data.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      const removed = this.data.notifications.splice(idx, 1);
      await this.save();
      return removed[0];
    }
    return null;
  }

  // Password Reset
  async createPasswordResetRequest(email, user) {
    if (!this.data.passwordResetRequests) this.data.passwordResetRequests = [];
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const request = {
      id: 'prr_' + Date.now() + Math.random().toString(36).substring(2, 5),
      userId: user.id,
      email: user.email.toLowerCase(),
      userName: user.name,
      code,
      status: 'pending_verification',
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    this.data.passwordResetRequests.unshift(request);
    await this.addNotification({
      type: 'password_reset_request',
      title: 'Password Reset Authorization',
      message: 'Customer requested password reset.',
      code,
      email: user.email,
      createdAt: new Date().toISOString()
    });
    await this.save();
    return { request, user, code };
  }

  getResetRequestByEmail(email) {
    if (!this.data.passwordResetRequests) return null;
    return this.data.passwordResetRequests.find(r => r.email === email.toLowerCase() && r.status === 'pending_verification' && new Date(r.expiresAt) > new Date());
  }

  async verifyAndConsumeResetCode(email, code) {
    if (!this.data.passwordResetRequests) return false;
    const reqIndex = this.data.passwordResetRequests.findIndex(
      r => r.email === email.toLowerCase() && r.code === code.trim() && r.status === 'pending_verification' && new Date(r.expiresAt) > new Date()
    );
    if (reqIndex !== -1) {
      this.data.passwordResetRequests.splice(reqIndex, 1);
      await this.save();
      return true;
    }
    return false;
  }
}

const db = new Database();
module.exports = db;
