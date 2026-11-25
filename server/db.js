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

let MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI && process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('mongodb://') || process.env.DATABASE_URL.startsWith('mongodb+srv://'))) {
  MONGO_URI = process.env.DATABASE_URL;
}
if (!MONGO_URI) {
  MONGO_URI = 'mongodb+srv://scentory10_db_user:Scentory2026@cluster0.gg2kvzg.mongodb.net/scentory?retryWrites=true&w=majority';
}

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
        accountName: 'SCENTORY LUXURY PARFUMS (PVT) LTD',
        accountNumber: '8012345678',
        branch: 'Colombo 07 Branch',
        swiftCode: 'CCEYLKX',
        instructions: 'Please transfer the exact total amount and use your name or phone number as the payment reference. Upload the screenshot/receipt slip below.'
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
    try {
      this.client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });
      this.connectPromise = this.client.connect().then(async (c) => {
        this.mongoDb = c.db('scentory');
        await this.syncFromMongo();
      }).catch(err => {
        console.error('MongoDB Atlas connect error:', err.message);
      });
    } catch (err) {
      console.error('Failed to initialize MongoClient:', err.message);
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
          this.data.settings = { ...getInitialData().settings, ...cleanSettings };
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
    if (!this.mongoDb) {
      this.initMongo();
    }
    if (this.lastSyncTime === 0 && this.connectPromise) {
      try {
        await this.connectPromise;
      } catch (e) {}
    } else if (Date.now() - this.lastSyncTime > 5000 && !this.isSyncing) {
      this.syncFromMongo().catch(() => {});
    }
  }

  // ==================== SETTINGS ====================
  getSettings() {
    return this.data.settings || {};
  }

  async updateSettings(updates) {
    this.data.settings = { ...this.data.settings, ...updates, updatedAt: new Date().toISOString() };
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_settings').updateOne(
          { _id: 'general' },
          { $set: this.data.settings },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving settings to MongoDB:', err.message);
      }
    }
    return this.data.settings;
  }

  // ==================== USERS ====================
  getUsers() {
    return this.data.users || [];
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  }

  getUserByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return this.getUsers().find(u => (u.email || '').trim().toLowerCase() === clean);
  }

  async addUser(user) {
    const existingIdx = this.data.users.findIndex(u => (u.email || '').toLowerCase() === (user.email || '').toLowerCase());
    if (existingIdx !== -1) {
      this.data.users[existingIdx] = user;
    } else {
      this.data.users.unshift(user);
    }
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_users').updateOne(
          { _id: user.id },
          { $set: user },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving user to MongoDB:', err.message);
      }
    }
    return user;
  }

  async updateUser(id, updates) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
      const updatedUser = this.data.users[idx];
      await this.save();

      if (this.mongoDb) {
        try {
          await this.mongoDb.collection('store_users').updateOne(
            { _id: id },
            { $set: updatedUser }
          );
        } catch (err) {
          console.error('Error updating user in MongoDB:', err.message);
        }
      }
      return updatedUser;
    }
    return null;
  }

  async deleteUser(id) {
    const user = this.data.users.find(u => u.id === id || u._id === id);
    const email = user?.email;
    this.data.users = this.data.users.filter(u => u.id !== id && u._id !== id && (!email || u.email !== email));
    await this.save();

    if (this.mongoDb) {
      try {
        const orClauses = [{ _id: id }, { id: id }];
        if (email) orClauses.push({ email: email });
        await this.mongoDb.collection('store_users').deleteMany({ $or: orClauses });
      } catch (err) {
        console.error('Error deleting user from MongoDB:', err.message);
      }
    }
    return user || { id, deleted: true };
  }

  // ==================== PRODUCTS ====================
  getProducts() {
    return this.data.products || [];
  }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id);
  }

  async addProduct(product) {
    this.data.products.unshift(product);
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_products').updateOne(
          { _id: product.id },
          { $set: product },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving product to MongoDB:', err.message);
      }
    }
    return product;
  }

  async updateProduct(id, updates) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...updates, updatedAt: new Date().toISOString() };
      const updatedProd = this.data.products[idx];
      await this.save();

      if (this.mongoDb) {
        try {
          await this.mongoDb.collection('store_products').updateOne(
            { _id: id },
            { $set: updatedProd }
          );
        } catch (err) {
          console.error('Error updating product in MongoDB:', err.message);
        }
      }
      return updatedProd;
    }
    return null;
  }

  async deleteProduct(id) {
    const product = this.data.products.find(p => p.id === id || p._id === id);
    this.data.products = this.data.products.filter(p => p.id !== id && p._id !== id);
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_products').deleteMany({
          $or: [{ _id: id }, { id: id }]
        });
      } catch (err) {
        console.error('Error deleting product from MongoDB:', err.message);
      }
    }
    return product || { id, deleted: true };
  }

  // ==================== ORDERS ====================
  getOrders() {
    return this.data.orders || [];
  }

  getOrderById(id) {
    return this.getOrders().find(o => o.id === id);
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
    this.data.orders.unshift(order);
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_orders').updateOne(
          { _id: order.id },
          { $set: order },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving order to MongoDB:', err.message);
      }
    }
    return order;
  }

  async updateOrder(id, updates) {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates, updatedAt: new Date().toISOString() };
      const updatedOrder = this.data.orders[idx];
      await this.save();

      if (this.mongoDb) {
        try {
          await this.mongoDb.collection('store_orders').updateOne(
            { _id: id },
            { $set: updatedOrder }
          );
        } catch (err) {
          console.error('Error updating order in MongoDB:', err.message);
        }
      }
      return updatedOrder;
    }
    return null;
  }

  async deleteOrder(id) {
    const idx = this.data.orders.findIndex(o => o.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.orders.splice(idx, 1)[0];
      await this.save();
    }
    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_orders').deleteOne({ _id: id });
      } catch (err) {
        console.error('Error deleting order from MongoDB:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== REVIEWS ====================
  getReviews() {
    return this.data.reviews || [];
  }

  async addReview(review) {
    this.data.reviews.unshift(review);
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_reviews').updateOne(
          { _id: review.id },
          { $set: review },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving review to MongoDB:', err.message);
      }
    }
    return review;
  }

  async deleteReview(id) {
    const idx = this.data.reviews.findIndex(r => r.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.reviews.splice(idx, 1)[0];
      await this.save();
    }
    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_reviews').deleteOne({ _id: id });
      } catch (err) {
        console.error('Error deleting review from MongoDB:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== NOTIFICATIONS ====================
  getNotifications() {
    return this.data.notifications || [];
  }

  async addNotification(notif) {
    this.data.notifications.unshift(notif);
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_notifications').updateOne(
          { _id: notif.id },
          { $set: notif },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving notification to MongoDB:', err.message);
      }
    }
    return notif;
  }

  async markAllNotificationsRead() {
    this.data.notifications.forEach(n => { n.isRead = true; });
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_notifications').updateMany({}, { $set: { isRead: true } });
      } catch (err) {
        console.error('Error marking notifications read in MongoDB:', err.message);
      }
    }
    return this.data.notifications;
  }

  async markNotificationRead(id) {
    const n = this.data.notifications.find(item => item.id === id);
    if (n) {
      n.isRead = true;
      await this.save();
      if (this.mongoDb) {
        try {
          await this.mongoDb.collection('store_notifications').updateOne({ _id: id }, { $set: { isRead: true } });
        } catch (err) {}
      }
    }
    return n;
  }

  async clearAllNotifications() {
    this.data.notifications = [];
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_notifications').deleteMany({});
      } catch (err) {}
    }
    return [];
  }

  async deleteNotification(id) {
    const idx = this.data.notifications.findIndex(n => n.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.notifications.splice(idx, 1)[0];
      await this.save();
    }
    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_notifications').deleteOne({ _id: id });
      } catch (err) {}
    }
    return removed;
  }

  // ==================== LIVE CHAT ====================
  getChatMessages() {
    return this.data.chatMessages || [];
  }

  async addChatMessage(msg) {
    this.data.chatMessages.push(msg);
    await this.save();

    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_chat').updateOne(
          { _id: msg.id },
          { $set: msg },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving chat message to MongoDB:', err.message);
      }
    }
    return msg;
  }

  async deleteChatMessage(id) {
    const idx = this.data.chatMessages.findIndex(m => m.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.chatMessages.splice(idx, 1)[0];
      await this.save();
    }
    if (this.mongoDb) {
      try {
        await this.mongoDb.collection('store_chat').deleteOne({ _id: id });
      } catch (err) {}
    }
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
