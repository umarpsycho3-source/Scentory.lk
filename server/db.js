const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let Pool = null;
try {
  const pg = require('pg');
  Pool = pg.Pool;
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
    this.pgPool = null;
    this.connectPromise = null;
    this.lastSyncTime = 0;
    this.isSyncing = false;
    this.data = getInitialData();
    this.init();

    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || 'postgresql://postgres.eearoqvhvmnzsuvdangq:Scentory2026%21@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
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
      // 1. Settings
      try {
        const sRes = await this.pgPool.query("SELECT data FROM store_settings WHERE id = 'general'");
        if (sRes.rows.length > 0 && sRes.rows[0].data) {
          const initial = getInitialData();
          this.data.settings = { ...initial.settings, ...sRes.rows[0].data };
        } else {
          await this.pgPool.query(
            "INSERT INTO store_settings (id, data, updated_at) VALUES ('general', $1, NOW()) ON CONFLICT (id) DO NOTHING",
            [JSON.stringify(this.data.settings)]
          );
        }
      } catch (e) {
        console.error('Sync settings error:', e.message);
      }

      // 2. Users
      try {
        const uRes = await this.pgPool.query("SELECT data FROM store_users ORDER BY updated_at DESC");
        if (uRes.rows.length > 0) {
          this.data.users = uRes.rows.map(r => r.data);
        } else {
          for (const u of this.data.users) {
            await this.pgPool.query(
              "INSERT INTO store_users (id, email, data, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (id) DO NOTHING",
              [u.id, (u.email || '').toLowerCase(), JSON.stringify(u)]
            );
          }
        }
      } catch (e) {
        console.error('Sync users error:', e.message);
      }

      // 3. Products
      try {
        const pRes = await this.pgPool.query("SELECT data FROM store_products ORDER BY updated_at DESC");
        this.data.products = pRes.rows.map(r => r.data);
      } catch (e) {
        console.error('Sync products error:', e.message);
      }

      // 4. Orders
      try {
        const oRes = await this.pgPool.query("SELECT data FROM store_orders ORDER BY created_at DESC");
        this.data.orders = oRes.rows.map(r => r.data);
      } catch (e) {
        console.error('Sync orders error:', e.message);
      }

      // 5. Reviews
      try {
        const rRes = await this.pgPool.query("SELECT data FROM store_reviews ORDER BY created_at DESC");
        this.data.reviews = rRes.rows.map(r => r.data);
      } catch (e) {
        console.error('Sync reviews error:', e.message);
      }

      // 6. Notifications
      try {
        const nRes = await this.pgPool.query("SELECT data FROM store_notifications ORDER BY created_at DESC");
        this.data.notifications = nRes.rows.map(r => r.data);
      } catch (e) {
        console.error('Sync notifs error:', e.message);
      }

      // 7. Chat
      try {
        const cRes = await this.pgPool.query("SELECT data FROM store_chat ORDER BY created_at ASC");
        this.data.chatMessages = cRes.rows.map(r => r.data);
      } catch (e) {
        console.error('Sync chat error:', e.message);
      }

      this.lastSyncTime = Date.now();
      try { fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8'); } catch (e) {}
    } catch (err) {
      console.error('Supabase sync overall error:', err.message);
    } finally {
      this.isSyncing = false;
    }
  }

  async ensureConnected() {
    if (!this.pgPool) {
      const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || 'postgresql://postgres.eearoqvhvmnzsuvdangq:Scentory2026%21@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
      if (Pool && dbUrl) this.initPg(dbUrl);
    }

    if (this.lastSyncTime === 0 && this.connectPromise) {
      try {
        await this.connectPromise;
      } catch (e) {
        console.error('Initial Supabase wait failed:', e.message);
      }
    } else if (Date.now() - this.lastSyncTime > 4000 && !this.isSyncing) {
      this.syncFromSupabase().catch(() => {});
    }
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
          products: parsed.products || [],
          users: parsed.users && parsed.users.length > 0 ? parsed.users : getInitialData().users
        };
      }
    } catch (err) {
      this.data = getInitialData();
    }
  }

  async save() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8'); } catch (e) {}
  }

  // ==================== USERS ====================
  getUsers() { return this.data.users || []; }
  getUserById(id) { return this.getUsers().find(u => u.id === id); }
  getUserByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return this.getUsers().find(u => (u.email || '').trim().toLowerCase() === clean);
  }

  async addUser(user) {
    // Add to in-memory array immediately
    const existingIdx = this.data.users.findIndex(u => (u.email || '').toLowerCase() === (user.email || '').toLowerCase());
    if (existingIdx !== -1) {
      this.data.users[existingIdx] = user;
    } else {
      this.data.users.unshift(user);
    }
    await this.save();

    // Persist directly to store_users table
    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO store_users (id, email, data, updated_at) 
           VALUES ($1, $2, $3, NOW()) 
           ON CONFLICT (email) DO UPDATE SET data = $3, updated_at = NOW();`,
          [user.id, (user.email || '').toLowerCase(), JSON.stringify(user)]
        );
      } catch (err) {
        console.error('Error saving user to Supabase:', err.message);
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

      if (this.pgPool) {
        try {
          await this.pgPool.query(
            `UPDATE store_users SET data = $2, email = $3, updated_at = NOW() WHERE id = $1;`,
            [id, JSON.stringify(updatedUser), (updatedUser.email || '').toLowerCase()]
          );
        } catch (err) {
          console.error('Error updating user in Supabase:', err.message);
        }
      }
      return updatedUser;
    }
    return null;
  }

  async deleteUser(id) {
    const idx = this.data.users.findIndex(u => u.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.users.splice(idx, 1)[0];
      await this.save();
    }
    if (this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM store_users WHERE id = $1;`, [id]);
      } catch (err) {
        console.error('Error deleting user from Supabase:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== PRODUCTS ====================
  getProducts() { return this.data.products || []; }
  getProductById(id) { return this.getProducts().find(p => p.id === id); }

  async addProduct(product) {
    this.data.products.unshift(product);
    await this.save();

    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO store_products (id, data, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW();`,
          [product.id, JSON.stringify(product)]
        );
      } catch (err) {
        console.error('Error saving product to Supabase:', err.message);
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

      if (this.pgPool) {
        try {
          await this.pgPool.query(
            `UPDATE store_products SET data = $2, updated_at = NOW() WHERE id = $1;`,
            [id, JSON.stringify(updatedProd)]
          );
        } catch (err) {
          console.error('Error updating product in Supabase:', err.message);
        }
      }
      return updatedProd;
    }
    return null;
  }

  async deleteProduct(id) {
    const idx = this.data.products.findIndex(p => p.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.products.splice(idx, 1)[0];
      await this.save();
    }
    if (this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM store_products WHERE id = $1;`, [id]);
      } catch (err) {
        console.error('Error deleting product from Supabase:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== ORDERS ====================
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
    await this.save();

    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO store_orders (id, data, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2;`,
          [order.id, JSON.stringify(order)]
        );
      } catch (err) {
        console.error('Error saving order to Supabase:', err.message);
      }
    }

    await this.addNotification({
      type: 'new_order',
      title: 'New Bank Transfer Order',
      message: `New bank transfer order placed #${order.id}. Verify deposit slip.`,
      orderId: order.id,
      timestamp: new Date().toISOString()
    });

    return order;
  }

  async updateOrder(id, updates) {
    const target = String(id || '').trim().toLowerCase();
    const idx = this.data.orders.findIndex(o => String(o.id || '').trim().toLowerCase() === target);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates, updatedAt: new Date().toISOString() };
      const updatedOrder = this.data.orders[idx];
      await this.save();

      if (this.pgPool) {
        try {
          await this.pgPool.query(`UPDATE store_orders SET data = $2 WHERE id = $1;`, [updatedOrder.id, JSON.stringify(updatedOrder)]);
        } catch (err) {
          console.error('Error updating order in Supabase:', err.message);
        }
      }
      return updatedOrder;
    }
    return null;
  }

  async deleteOrder(id) {
    const target = String(id || '').trim().toLowerCase();
    const idx = this.data.orders.findIndex(o => String(o.id || '').trim().toLowerCase() === target);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.orders.splice(idx, 1)[0];
      await this.save();
    }
    if (this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM store_orders WHERE LOWER(id) = $1;`, [target]);
      } catch (err) {
        console.error('Error deleting order from Supabase:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== REVIEWS ====================
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

    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO store_reviews (id, data, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2;`,
          [review.id, JSON.stringify(review)]
        );
      } catch (err) {
        console.error('Error saving review to Supabase:', err.message);
      }
    }
    return review;
  }

  async deleteReview(id) {
    if (!this.data.reviews) return null;
    const idx = this.data.reviews.findIndex(r => r.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.reviews.splice(idx, 1)[0];
      await this.save();
    }
    if (this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM store_reviews WHERE id = $1;`, [id]);
      } catch (err) {
        console.error('Error deleting review from Supabase:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== SETTINGS ====================
  getSettings() { return this.data.settings || {}; }

  async updateSettings(updates) {
    if (updates && updates.heroVideoUrl && typeof updates.heroVideoUrl === 'string' && updates.heroVideoUrl.startsWith('data:video/')) {
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

    this.data.settings = { ...this.data.settings, ...updates, updatedAt: new Date().toISOString() };
    await this.save();

    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO store_settings (id, data, updated_at) 
           VALUES ('general', $1, NOW()) 
           ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();`,
          [JSON.stringify(this.data.settings)]
        );
      } catch (err) {
        console.error('Error saving settings to Supabase:', err.message);
      }
    }
    return this.data.settings;
  }

  // ==================== CHAT ====================
  getChatMessages() { return this.data.chatMessages || []; }

  async addChatMessage(msg) {
    if (!this.data.chatMessages) this.data.chatMessages = [];
    this.data.chatMessages.push(msg);
    await this.save();

    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO store_chat (id, data, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING;`,
          [msg.id || ('chat_' + Date.now()), JSON.stringify(msg)]
        );
      } catch (err) {
        console.error('Error saving chat message to Supabase:', err.message);
      }
    }
    return msg;
  }

  async deleteChatMessage(id) {
    if (!this.data.chatMessages) return null;
    const idx = this.data.chatMessages.findIndex(m => m.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.chatMessages.splice(idx, 1)[0];
      await this.save();
    }
    if (this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM store_chat WHERE id = $1;`, [id]);
      } catch (err) {
        console.error('Error deleting chat from Supabase:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== NOTIFICATIONS ====================
  getNotifications() { return this.data.notifications || []; }

  async addNotification(notif) {
    if (!this.data.notifications) this.data.notifications = [];
    const item = {
      id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 6),
      read: false,
      ...notif
    };
    this.data.notifications.unshift(item);
    if (this.data.notifications.length > 100) {
      this.data.notifications = this.data.notifications.slice(0, 100);
    }
    await this.save();

    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO store_notifications (id, data, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING;`,
          [item.id, JSON.stringify(item)]
        );
      } catch (err) {
        console.error('Error saving notification to Supabase:', err.message);
      }
    }
    return item;
  }

  async markAllNotificationsRead() {
    if (!this.data.notifications) return [];
    this.data.notifications.forEach(n => { n.read = true; });
    await this.save();

    if (this.pgPool) {
      try {
        await this.pgPool.query(`UPDATE store_notifications SET data = jsonb_set(data, '{read}', 'true'::jsonb);`);
      } catch (err) {
        console.error('Error marking notifications in Supabase:', err.message);
      }
    }
    return this.data.notifications;
  }

  async markNotificationRead(id) {
    if (!this.data.notifications) return null;
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      await this.save();
      if (this.pgPool) {
        try {
          await this.pgPool.query(`UPDATE store_notifications SET data = jsonb_set(data, '{read}', 'true'::jsonb) WHERE id = $1;`, [id]);
        } catch (err) {
          console.error('Error marking notif in Supabase:', err.message);
        }
      }
      return notif;
    }
    return null;
  }

  async clearAllNotifications() {
    this.data.notifications = [];
    await this.save();
    if (this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM store_notifications;`);
      } catch (err) {
        console.error('Error clearing notifs in Supabase:', err.message);
      }
    }
    return [];
  }

  async deleteNotification(id) {
    if (!this.data.notifications) return null;
    const idx = this.data.notifications.findIndex(n => n.id === id);
    let removed = null;
    if (idx !== -1) {
      removed = this.data.notifications.splice(idx, 1)[0];
      await this.save();
    }
    if (this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM store_notifications WHERE id = $1;`, [id]);
      } catch (err) {
        console.error('Error deleting notif in Supabase:', err.message);
      }
    }
    return removed || { id, deleted: true };
  }

  // ==================== PASSWORD RESET ====================
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
      message: `Customer ${user.name} (${user.email}) requested password reset.`,
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
