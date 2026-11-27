require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Ensure data folder exists
try {
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  }
} catch (e) {}

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.DATABASE_URL || null;
}

const CANONICAL_BANK_DETAILS = {
  bankName: 'Commercial Bank',
  accountName: 'S M Suhail',
  accountNumber: '8021353334',
  branch: 'Gampola Branch',
  swiftCode: 'CCEYLKX',
  instructions: 'Please transfer the exact total amount and use your name or phone number as the payment reference. Upload the screenshot/receipt slip below.'
};

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
        bankName: 'Commercial Bank',
        accountName: 'S M Suhail',
        accountNumber: '8021353334',
        branch: 'Gampola Branch',
        swiftCode: 'CCEYLKX',
        instructions: 'Please transfer the exact total amount and use your name or phone number as the payment reference. Upload the screenshot/receipt slip below.'
      },
      promotionalDeal: {
        enabled: false,
        title: 'Buy 2 Get 1 Free',
        dealType: 'buy_x_get_y_free',
        buyQty: 2,
        freeQty: 1,
        bannerText: '✨ SPECIAL PROMOTION: Buy 2 perfumes, get 1 free automatically at checkout!',
        badgeText: 'BUY 2 GET 1 FREE',
        showBanner: true
      },
      heroBadge: "WE'RE LIVE • SCENTORY.LK",
      heroTitle: "A New Destination For Your",
      heroSubtitle: "Signature Scent.",
      heroDescription: "Discover artisan extrait de parfum, opulent royal ouds, and custom-decanted atomizers (10ml, 20ml, 50ml, 100ml). Curated exclusively for Sri Lanka’s fragrance lovers with verified bank transfer ordering.",
      heroVideoUrl: '/hero-uploaded-video.mp4',
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
    this.client = null;
    this.mongoDb = null;
    this.connectPromise = null;
    this.lastSyncTime = 0;
    this.isSyncing = false;
    this.data = getInitialData();
    this.init();
    this.initMongo();
  }

  init() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          ...getInitialData(),
          ...parsed,
          settings: { ...getInitialData().settings, ...(parsed.settings || {}) },
          products: Array.isArray(parsed.products) ? parsed.products : [],
          users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : getInitialData().users
        };
      }
    } catch (err) {
      this.data = getInitialData();
    }
  }

  async save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {}
  }

  initMongo() {
    const uri = getMongoUri();
    if (!uri) {
      console.warn('⚠️ [SCENTORY SECURITY WARNING] MONGODB_URI is not configured.');
      return;
    }
    try {
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10
      });
      this.connectPromise = this.client.connect().then(async (c) => {
        this.mongoDb = c.db('scentory');
        try {
          await this.mongoDb.collection('store_users').createIndex({ email: 1 }, { unique: true, sparse: true });
          await this.mongoDb.collection('store_orders').createIndex({ id: 1 }, { unique: true, sparse: true });
        } catch (idxErr) {}
        await this.syncFromMongo();
      }).catch(err => {
        console.error('MongoDB Atlas connect error:', err.message);
        this.mongoDb = null;
        throw err;
      });
    } catch (err) {
      console.error('Failed to initialize MongoClient:', err.message);
      throw err;
    }
  }

  async syncFromMongo() {
    if (!this.mongoDb || this.isSyncing) return;
    this.isSyncing = true;
    try {
      // 1. Settings
      try {
        const sDoc = await this.mongoDb.collection('store_settings').findOne({ _id: 'general' });
        if (sDoc) {
          const { _id, ...cleanSettings } = sDoc;
          this.data.settings = {
            ...getInitialData().settings,
            ...cleanSettings,
            bankDetails: { ...CANONICAL_BANK_DETAILS },
            promotionalDeal: { ...getInitialData().settings.promotionalDeal, ...(cleanSettings.promotionalDeal || {}) }
          };
          if (!cleanSettings.bankDetails || cleanSettings.bankDetails.accountNumber !== CANONICAL_BANK_DETAILS.accountNumber) {
            await this.mongoDb.collection('store_settings').updateOne(
              { _id: 'general' },
              { $set: { bankDetails: CANONICAL_BANK_DETAILS } }
            );
          }
        } else {
          await this.mongoDb.collection('store_settings').updateOne(
            { _id: 'general' },
            { $set: this.data.settings },
            { upsert: true }
          );
        }
      } catch (e) {
        console.error('Sync settings error:', e.message);
      }

      // 2. Users
      try {
        const uDocs = await this.mongoDb.collection('store_users').find({}).toArray();
        if (uDocs.length > 0) {
          this.data.users = uDocs.map(u => {
            const { _id, ...clean } = u;
            return { id: _id, ...clean };
          });
        } else {
          this.data.users = getInitialData().users;
          await this.mongoDb.collection('store_users').updateOne(
            { _id: 'usr_admin' },
            { $set: this.data.users[0] },
            { upsert: true }
          );
        }
      } catch (e) {
        console.error('Sync users error:', e.message);
      }

      // 3. Products
      try {
        const pDocs = await this.mongoDb.collection('store_products').find({}).toArray();
        this.data.products = pDocs.map(p => {
          const { _id, ...clean } = p;
          return { id: _id, ...clean };
        });
      } catch (e) {
        console.error('Sync products error:', e.message);
      }

      // 4. Orders
      try {
        const oDocs = await this.mongoDb.collection('store_orders').find({}).sort({ createdAt: -1 }).toArray();
        this.data.orders = oDocs.map(o => {
          const { _id, ...clean } = o;
          return { id: _id, ...clean };
        });
      } catch (e) {
        console.error('Sync orders error:', e.message);
      }

      // 5. Reviews
      try {
        const rDocs = await this.mongoDb.collection('store_reviews').find({}).sort({ createdAt: -1 }).toArray();
        this.data.reviews = rDocs.map(r => {
          const { _id, ...clean } = r;
          return { id: _id, ...clean };
        });
      } catch (e) {
        console.error('Sync reviews error:', e.message);
      }

      // 6. Notifications
      try {
        const nDocs = await this.mongoDb.collection('store_notifications').find({}).sort({ createdAt: -1 }).toArray();
        this.data.notifications = nDocs.map(n => {
          const { _id, ...clean } = n;
          return { id: _id, ...clean };
        });
      } catch (e) {
        console.error('Sync notifications error:', e.message);
      }

      // 7. Chat
      try {
        const cDocs = await this.mongoDb.collection('store_chat').find({}).sort({ timestamp: 1 }).toArray();
        this.data.chatMessages = cDocs.map(c => {
          const { _id, ...clean } = c;
          return { id: _id, ...clean };
        });
      } catch (e) {
        console.error('Sync chat error:', e.message);
      }

      this.lastSyncTime = Date.now();
      await this.save();
    } catch (err) {
      console.error('MongoDB sync overall error:', err.message);
    } finally {
      this.isSyncing = false;
    }
  }

  async ensureConnected() {
    const uri = getMongoUri();
    if (!uri) {
      throw new Error('Database service unavailable: MONGODB_URI is not configured.');
    }
    if (!this.mongoDb) {
      this.initMongo();
    }
    if (this.connectPromise) {
      await this.connectPromise;
    }
    if (!this.mongoDb) {
      throw new Error('Failed to establish connection to MongoDB Atlas.');
    }
    if (Date.now() - this.lastSyncTime > 5000 && !this.isSyncing) {
      await this.syncFromMongo();
    }
  }

  // ==================== SETTINGS ====================
  getSettings() {
    const s = this.data.settings || {};
    return {
      ...s,
      bankDetails: { ...CANONICAL_BANK_DETAILS }
    };
  }

  async updateSettings(updates) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for settings update.');
    }
    // Enforce locked canonical bank details
    const cleanUpdates = { ...updates, bankDetails: { ...CANONICAL_BANK_DETAILS } };
    this.data.settings = { ...this.data.settings, ...cleanUpdates, updatedAt: new Date().toISOString() };
    await this.mongoDb.collection('store_settings').updateOne(
      { _id: 'general' },
      { $set: this.data.settings },
      { upsert: true }
    );
    await this.save();
    return this.data.settings;
  }

  // ==================== USERS ====================
  getUsers() {
    return this.data.users || [];
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === id || u._id === id);
  }

  getUserByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return this.getUsers().find(u => (u.email || '').trim().toLowerCase() === clean);
  }

  async addUser(user) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for user registration.');
    }
    await this.mongoDb.collection('store_users').updateOne(
      { _id: user.id },
      { $set: user },
      { upsert: true }
    );
    const existingIdx = this.data.users.findIndex(u => (u.email || '').toLowerCase() === (user.email || '').toLowerCase());
    if (existingIdx !== -1) {
      this.data.users[existingIdx] = user;
    } else {
      this.data.users.unshift(user);
    }
    await this.save();
    return user;
  }

  async updateUser(id, updates) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for user update.');
    }
    const idx = this.data.users.findIndex(u => u.id === id || u._id === id);
    const existing = idx !== -1 ? this.data.users[idx] : {};
    const updatedUser = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.mongoDb.collection('store_users').updateOne(
      { $or: [{ _id: id }, { id: id }] },
      { $set: updatedUser }
    );
    if (idx !== -1) {
      this.data.users[idx] = updatedUser;
    }
    await this.save();
    return updatedUser;
  }

  async deleteUser(id) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for customer deletion.');
    }
    const user = this.data.users.find(u => u.id === id || u._id === id);
    const email = user?.email;
    const orClauses = [{ _id: id }, { id: id }];
    if (email) orClauses.push({ email: email });

    await this.mongoDb.collection('store_users').deleteMany({ $or: orClauses });
    this.data.users = this.data.users.filter(u => u.id !== id && u._id !== id && (!email || u.email !== email));
    await this.save();
    return user || { id, deleted: true };
  }

  // ==================== PRODUCTS ====================
  getProducts() {
    return this.data.products || [];
  }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id || p._id === id);
  }

  async addProduct(product) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for product creation.');
    }
    await this.mongoDb.collection('store_products').updateOne(
      { _id: product.id },
      { $set: product },
      { upsert: true }
    );
    this.data.products.unshift(product);
    await this.save();
    return product;
  }

  async updateProduct(id, updates) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for product update.');
    }
    const idx = this.data.products.findIndex(p => p.id === id || p._id === id);
    const existing = idx !== -1 ? this.data.products[idx] : {};
    const updatedProd = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.mongoDb.collection('store_products').updateOne(
      { $or: [{ _id: id }, { id: id }] },
      { $set: updatedProd }
    );
    if (idx !== -1) {
      this.data.products[idx] = updatedProd;
    } else {
      this.data.products.unshift(updatedProd);
    }
    await this.save();
    return updatedProd;
  }

  async deleteProduct(id) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for product deletion.');
    }
    const product = this.data.products.find(p => p.id === id || p._id === id);
    await this.mongoDb.collection('store_products').deleteMany({
      $or: [{ _id: id }, { id: id }]
    });
    this.data.products = this.data.products.filter(p => p.id !== id && p._id !== id);
    await this.save();
    return product || { id, deleted: true };
  }

  // ==================== ORDERS ====================
  getOrders() {
    return this.data.orders || [];
  }

  getOrderById(id) {
    return this.getOrders().find(o => o.id === id || o._id === id);
  }

  getUserOrders(userId, userEmail) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    return this.getOrders().filter(o => {
      if (userId && o.userId === userId) return true;
      if (cleanEmail && o.customerDetails?.email && o.customerDetails.email.trim().toLowerCase() === cleanEmail) return true;
      return false;
    });
  }

  getOrdersByUserId(userId, userEmail) {
    return this.getUserOrders(userId, userEmail);
  }

  async addOrder(order) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for order placement.');
    }
    await this.mongoDb.collection('store_orders').updateOne(
      { _id: order.id },
      { $set: order },
      { upsert: true }
    );
    this.data.orders.unshift(order);
    await this.save();
    return order;
  }

  async updateOrder(id, updates) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for order update.');
    }
    const idx = this.data.orders.findIndex(o => o.id === id || o._id === id);
    const existing = idx !== -1 ? this.data.orders[idx] : {};
    const updatedOrder = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.mongoDb.collection('store_orders').updateOne(
      { $or: [{ _id: id }, { id: id }] },
      { $set: updatedOrder }
    );
    if (idx !== -1) {
      this.data.orders[idx] = updatedOrder;
    }
    await this.save();
    return updatedOrder;
  }

  async deleteOrder(id) {
    await this.ensureConnected();
    if (!this.mongoDb) {
      throw new Error('Database service unavailable for order deletion.');
    }
    const idx = this.data.orders.findIndex(o => o.id === id || o._id === id);
    const order = idx !== -1 ? this.data.orders.splice(idx, 1)[0] : null;
    await this.mongoDb.collection('store_orders').deleteMany({
      $or: [{ _id: id }, { id: id }]
    });
    await this.save();
    return order || { id, deleted: true };
  }

  // ==================== REVIEWS ====================
  getReviews() {
    return this.data.reviews || [];
  }

  async addReview(review) {
    await this.ensureConnected();
    if (!this.mongoDb) throw new Error('Database service unavailable for adding review.');
    await this.mongoDb.collection('store_reviews').updateOne(
      { _id: review.id },
      { $set: review },
      { upsert: true }
    );
    this.data.reviews.unshift(review);
    await this.save();
    return review;
  }

  async deleteReview(id) {
    await this.ensureConnected();
    if (!this.mongoDb) throw new Error('Database service unavailable for deleting review.');
    const idx = this.data.reviews.findIndex(r => r.id === id || r._id === id);
    const removed = idx !== -1 ? this.data.reviews.splice(idx, 1)[0] : null;
    await this.mongoDb.collection('store_reviews').deleteMany({
      $or: [{ _id: id }, { id: id }]
    });
    await this.save();
    return removed || { id, deleted: true };
  }

  // ==================== NOTIFICATIONS ====================
  getNotifications() {
    return this.data.notifications || [];
  }

  async addNotification(notif) {
    await this.ensureConnected();
    if (this.mongoDb) {
      await this.mongoDb.collection('store_notifications').updateOne(
        { _id: notif.id },
        { $set: notif },
        { upsert: true }
      );
    }
    this.data.notifications.unshift(notif);
    await this.save();
    return notif;
  }

  async markAllNotificationsRead() {
    await this.ensureConnected();
    if (this.mongoDb) {
      await this.mongoDb.collection('store_notifications').updateMany({}, { $set: { isRead: true } });
    }
    this.data.notifications.forEach(n => { n.isRead = true; });
    await this.save();
    return this.data.notifications;
  }

  async markNotificationRead(id) {
    await this.ensureConnected();
    const n = this.data.notifications.find(item => item.id === id || item._id === id);
    if (n) {
      n.isRead = true;
      if (this.mongoDb) {
        await this.mongoDb.collection('store_notifications').updateOne(
          { $or: [{ _id: id }, { id: id }] },
          { $set: { isRead: true } }
        );
      }
      await this.save();
    }
    return n;
  }

  async clearAllNotifications() {
    await this.ensureConnected();
    if (this.mongoDb) {
      await this.mongoDb.collection('store_notifications').deleteMany({});
    }
    this.data.notifications = [];
    await this.save();
    return [];
  }

  async deleteNotification(id) {
    await this.ensureConnected();
    const idx = this.data.notifications.findIndex(n => n.id === id || n._id === id);
    const removed = idx !== -1 ? this.data.notifications.splice(idx, 1)[0] : null;
    if (this.mongoDb) {
      await this.mongoDb.collection('store_notifications').deleteMany({
        $or: [{ _id: id }, { id: id }]
      });
    }
    await this.save();
    return removed;
  }

  // ==================== LIVE CHAT ====================
  getChatMessages() {
    return this.data.chatMessages || [];
  }

  async addChatMessage(msg) {
    await this.ensureConnected();
    if (this.mongoDb) {
      await this.mongoDb.collection('store_chat').updateOne(
        { _id: msg.id },
        { $set: msg },
        { upsert: true }
      );
    }
    this.data.chatMessages.push(msg);
    await this.save();
    return msg;
  }

  async deleteChatMessage(id) {
    await this.ensureConnected();
    const idx = this.data.chatMessages.findIndex(m => m.id === id || m._id === id);
    const removed = idx !== -1 ? this.data.chatMessages.splice(idx, 1)[0] : null;
    if (this.mongoDb) {
      await this.mongoDb.collection('store_chat').deleteMany({
        $or: [{ _id: id }, { id: id }]
      });
    }
    await this.save();
    return removed;
  }

  // ==================== PASSWORD RESET ====================
  getPasswordResetRequests() {
    return this.data.passwordResetRequests || [];
  }

  createPasswordResetRequest(email, code) {
    if (!this.data.passwordResetRequests) this.data.passwordResetRequests = [];
    const request = {
      email: email.trim().toLowerCase(),
      code,
      expiresAt: Date.now() + 15 * 60 * 1000
    };
    this.data.passwordResetRequests.push(request);
    this.save().catch(() => {});
    return request;
  }

  getResetRequestByEmail(email) {
    if (!this.data.passwordResetRequests) return null;
    const clean = email.trim().toLowerCase();
    return this.data.passwordResetRequests.find(r => r.email === clean && r.expiresAt > Date.now());
  }

  verifyAndConsumeResetCode(email, code) {
    if (!this.data.passwordResetRequests) return false;
    const clean = email.trim().toLowerCase();
    const idx = this.data.passwordResetRequests.findIndex(
      r => r.email === clean && r.code.trim() === code.trim() && r.expiresAt > Date.now()
    );
    if (idx !== -1) {
      this.data.passwordResetRequests.splice(idx, 1);
      this.save().catch(() => {});
      return true;
    }
    return false;
  }
}

const databaseInstance = new Database();
module.exports = databaseInstance;
