const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let Client = null;
try {
  Client = require('pg').Client;
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
    products: [
      {
        id: 'prod_oud_royale',
        name: 'Oud Royale Impérial',
        gender: 'Unisex',
        scentFamily: 'Oriental Woody Oud',
        badge: 'Signature Masterpiece',
        isFeatured: true,
        rating: 5.0,
        reviewCount: 0,
        description: 'Opulent Cambodian agarwood blended with amber, smoky leather, and Turkish damask rose. Sri Lanka signature luxury extrait de parfum.',
        images: ['/brand-logo.png'],
        variants: [
          { id: 'v_5ml', size: '5ml Pocket Spray', price: 1950, discountPrice: 1750, stock: 50 },
          { id: 'v_10ml', size: '10ml Travel Atomizer', price: 3800, discountPrice: 3400, stock: 40 },
          { id: 'v_20ml', size: '20ml Decant Flacon', price: 7200, discountPrice: 6500, stock: 25 },
          { id: 'v_50ml', size: '50ml Signature Bottle', price: 16500, discountPrice: 14900, stock: 15 },
          { id: 'v_100ml', size: '100ml Pure Extrait', price: 28500, discountPrice: 25900, stock: 10 }
        ],
        createdAt: new Date().toISOString()
      }
    ],
    orders: [],
    reviews: [],
    notifications: [],
    chatMessages: [],
    passwordResetRequests: []
  };
}

class Database {
  constructor() {
    this.pgClient = null;
    this.connectPromise = null;
    this.init();
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || 'postgresql://postgres.ipvlpxykoyyzketgtybb:Scentary2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
    if (Client && dbUrl) {
      this.connectPromise = this.connectPg(dbUrl);
    }
  }

  async ensureConnected() {
    if (this.connectPromise) {
      try { await this.connectPromise; } catch (e) {}
    } else {
      const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || 'postgresql://postgres.ipvlpxykoyyzketgtybb:Scentary2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
      if (Client && dbUrl && !this.pgClient) {
        this.connectPromise = this.connectPg(dbUrl);
        try { await this.connectPromise; } catch (e) {}
      }
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

  async connectPg(connectionString) {
    try {
      const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      console.log('✅ Connected to Supabase Cloud PostgreSQL!');
      this.pgClient = client;

      await client.query('CREATE TABLE IF NOT EXISTS store_data (id VARCHAR(50) PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());');

      const res = await client.query('SELECT data FROM store_data WHERE id = $1', ['main_store_data']);
      if (res.rows && res.rows.length > 0 && res.rows[0].data) {
        this.data = res.rows[0].data;
        console.log('✅ Synced live store data from Supabase!');
      } else {
      await (this.pgClient || client).query('INSERT INTO store_data (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW();', ['main_store_data', JSON.stringify(this.data)]);
        console.log('✅ Seeded clean initial store data to Supabase!');
      }
    } catch (err) {
      console.error('Supabase connection error:', err.message);
    }
  }

  async save() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8'); } catch (e) {}
    if (this.pgClient) {
      try {
      await (this.pgClient || client).query('INSERT INTO store_data (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW();', ['main_store_data', JSON.stringify(this.data)]);
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
    return null;
  }

  // Orders
  getOrders() { return this.data.orders || []; }
  getOrderById(id) { return this.getOrders().find(o => o.id === id); }
  getOrdersByUserId(userId) { return this.getOrders().filter(o => o.userId === userId); }
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
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates };
      await this.save();
      return this.data.orders[idx];
    }
    return null;
  }
  async deleteOrder(id) {
    const idx = this.data.orders.findIndex(o => o.id === id);
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
