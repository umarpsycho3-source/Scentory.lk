import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ShoppingBag, Package, Settings, BarChart3,
  CheckCircle2, XCircle, Clock, Search, Plus, Trash2, Edit,
  ExternalLink, Eye, ArrowUpRight, DollarSign, Users, AlertTriangle,
  Upload, Link as LinkIcon, RefreshCw, Printer, Shield, ChevronDown, LogOut,
  Bell, MessageSquare, Calendar, Star, Sparkles, Phone, MessageCircle,
  Crown, Key, Lock, Mail, Check, X, Gift, Tag, Percent
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminView({ onBackToShop }) {
  const { user, token, login, logout, isAdmin } = useAuth();

  // Active admin tab: 'dashboard' | 'orders' | 'products' | 'stock' | 'reports' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sri Lanka Phone Number Formatter for WhatsApp (converts 077... / 77... to 9477...)
  const formatLKPhone = (phone) => {
    let cleaned = String(phone || '').replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '94' + cleaned.substring(1);
    if (!cleaned.startsWith('94') && cleaned.length === 9) cleaned = '94' + cleaned;
    return cleaned;
  };

  // Admin login state if not already logged in
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & inspectors
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [previewSlipUrl, setPreviewSlipUrl] = useState(null);

  // Stock Inventory State (Search, Select & Update Variant)
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedStockProductId, setSelectedStockProductId] = useState(null);
  const [stockViewMode, setStockViewMode] = useState('select'); // 'select' | 'grid'
  const [stockDrafts, setStockDrafts] = useState({}); // { [variantId]: number }
  const [stockUpdateFeedback, setStockUpdateFeedback] = useState({}); // { [variantId]: boolean }

  // Notifications & Live Chat states
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const prevNotifCountRef = useRef(0);

  // Customers & VIP Membership Management
  const [customersList, setCustomersList] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerFilterTier, setCustomerFilterTier] = useState('all'); // 'all' | 'premium'
  const [selectedCustomerForPassword, setSelectedCustomerForPassword] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetFeedback, setPasswordResetFeedback] = useState({ success: '', error: '' });

  // Orders Date Filtering ('all' | 'today' | '7days' | '30days' | 'custom')
  const [orderDateFilter, setOrderDateFilter] = useState('all');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');

  // Filtered Orders & Verified Revenue Calculation
  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(order => {
    if (!order) return false;
    if (orderDateFilter === 'all') return true;
    const orderDate = new Date(order.createdAt || Date.now());
    const now = new Date();
    
    if (orderDateFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (orderDateFilter === '7days') {
      const diffTime = Math.abs(now - orderDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (orderDateFilter === '30days') {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }
    if (orderDateFilter === 'custom') {
      if (!dateFilterFrom && !dateFilterTo) return true;
      const orderDateStr = order.createdAt ? String(order.createdAt).split('T')[0] : '';
      if (dateFilterFrom && orderDateStr < dateFilterFrom) return false;
      if (dateFilterTo && orderDateStr > dateFilterTo) return false;
      return true;
    }
    return true;
  });

  const filteredVerifiedRevenue = filteredOrders
    .filter(o => o && o.paymentStatus === 'verified')
    .reduce((sum, o) => sum + (Number(o.finalTotal) || Number(o.totalAmount) || 0), 0);

  // Audio Synthesizer Chime for Real-Time Alerts
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {}
  };

  // Product Form State
  const initialProductForm = {
    name: '',
    tagline: 'Extrait De Parfum',
    description: '',
    gender: 'unisex',
    scentFamily: 'Oriental Woody',
    isFeatured: true,
    isSpecialOffer: false,
    badge: 'Signature Edition',
    notes: { top: ['Bergamot', 'Neroli', 'Lemon'], heart: ['Amber Resin', 'Oud'], base: ['Vanilla', 'Sandalwood'] },
    _notesDraft: { top: 'Bergamot, Neroli, Lemon', heart: 'Amber Resin, Oud', base: 'Vanilla, Sandalwood' },
    images: ['https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80'],
    variants: [
      { id: 'v1', size: '10ml Travel Atomizer', price: 3800, discountPrice: 3400, stock: 40, sku: 'DEC-10ML' },
      { id: 'v2', size: '20ml Decant Flacon', price: 7200, discountPrice: 6500, stock: 25, sku: 'DEC-20ML' },
      { id: 'v3', size: '50ml Signature Bottle', price: 16500, discountPrice: 14900, stock: 15, sku: 'DEC-50ML' },
      { id: 'v4', size: '100ml Pure Extrait', price: 28500, discountPrice: 25900, stock: 10, sku: 'FLA-100ML' }
    ]
  };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dealImageUrlInput, setDealImageUrlInput] = useState('');
  const [uploadingDealImage, setUploadingDealImage] = useState(false);
  const [dealProductSearch, setDealProductSearch] = useState('');

  // Live Auto-Refresh & Auto-Sync State
  const [autoSyncInterval, setAutoSyncInterval] = useState(() => {
    return localStorage.getItem('scentory_admin_autosync') || '60'; // Default: every 1 minute
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());
  const [timeAgo, setTimeAgo] = useState('Just now');
  const [newOrderBanner, setNewOrderBanner] = useState(null);
  const prevOrdersCountRef = useRef(0);
  const [autoPageReload10m, setAutoPageReload10m] = useState(() => {
    return localStorage.getItem('scentory_admin_pagereload') === 'true';
  });

  // Fetch admin data (silent: background update without full screen spinner)
  const loadAdminData = (silent = false) => {
    if (!token || !isAdmin) return;
    if (!silent) setLoading(true);
    setIsSyncing(true);

    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/dashboard-stats', { headers }).then(res => res.json()).catch(() => null),
      fetch('/api/orders', { headers }).then(res => res.json()).catch(() => []),
      fetch('/api/products').then(res => res.json()).catch(() => []),
      fetch('/api/settings').then(res => res.json()).catch(() => null),
      fetch('/api/admin/reports', { headers }).then(res => res.json()).catch(() => null),
      fetch('/api/notifications', { headers }).then(res => res.json()).catch(() => ({ notifications: [], unreadCount: 0 })),
      fetch('/api/chat/messages', { headers }).then(res => res.json()).catch(() => []),
      fetch('/api/reviews').then(res => res.json()).catch(() => ({ reviews: [] })),
      fetch('/api/admin/users', { headers }).then(res => res.json()).catch(() => [])
    ])
      .then(([statsData, ordersData, prodsData, settingsData, reportsData, notifData, chatData, reviewsData, usersData]) => {
        if (statsData) setStats(statsData);

        if (Array.isArray(ordersData)) {
          if (prevOrdersCountRef.current > 0 && ordersData.length > prevOrdersCountRef.current) {
            const added = ordersData.length - prevOrdersCountRef.current;
            playNotificationSound();
            setNewOrderBanner(`${added} new customer order${added > 1 ? 's' : ''} received!`);
            setTimeout(() => setNewOrderBanner(null), 10000);
          }
          prevOrdersCountRef.current = ordersData.length;
          setOrders(ordersData);
        }

        if (Array.isArray(prodsData)) setProducts(prodsData);
        if (settingsData) {
          if (settingsData.heroVideoUrl && typeof settingsData.heroVideoUrl === 'string' && settingsData.heroVideoUrl.startsWith('data:video')) {
            settingsData.heroVideoUrl = '/hero-uploaded-video.mp4';
          }
          setSettings(settingsData);
        }
        if (reportsData) setReports(reportsData);

        const notifs = notifData?.notifications || [];
        const unread = notifData?.unreadCount || 0;
        setNotifications(notifs);
        setUnreadNotifCount(unread);

        if (unread > prevNotifCountRef.current && prevNotifCountRef.current > 0) {
          playNotificationSound();
        }
        prevNotifCountRef.current = unread;

        if (Array.isArray(chatData)) setChatMessages(chatData);
        if (Array.isArray(reviewsData?.reviews)) setReviewsList(reviewsData.reviews);
        if (Array.isArray(usersData)) setCustomersList(usersData);

        setLastSyncedTime(new Date());
      })
      .catch(err => console.error('Admin data load error:', err))
      .finally(() => {
        if (!silent) setLoading(false);
        setIsSyncing(false);
      });
  };

  // Initial load
  useEffect(() => {
    loadAdminData(false);
  }, [token, isAdmin]);

  // Live Auto-Sync periodic polling (configurable interval)
  useEffect(() => {
    if (!token || !isAdmin) return;
    const intervalSec = parseInt(autoSyncInterval, 10);
    if (!intervalSec || intervalSec <= 0) return;

    const timer = setInterval(() => {
      loadAdminData(true);
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [token, isAdmin, autoSyncInterval]);

  // Relative last sync time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      if (!lastSyncedTime) return;
      const diffSec = Math.floor((Date.now() - new Date(lastSyncedTime).getTime()) / 1000);
      if (diffSec < 10) setTimeAgo('Just now');
      else if (diffSec < 60) setTimeAgo(`${diffSec}s ago`);
      else {
        const mins = Math.floor(diffSec / 60);
        setTimeAgo(`${mins}m ago`);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [lastSyncedTime]);

  // Optional: Full Browser Web Page Auto-Reload every 10 minutes (maintains user state via localStorage)
  useEffect(() => {
    if (!autoPageReload10m) return;
    const pageTimer = setInterval(() => {
      window.location.reload();
    }, 600000); // 10 minutes = 600,000ms
    return () => clearInterval(pageTimer);
  }, [autoPageReload10m]);

  const handleMarkAllNotifsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifCount(0);
      prevNotifCountRef.current = 0;
    } catch (err) {}
  };

  const handleMarkNotifRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
      prevNotifCountRef.current = Math.max(0, prevNotifCountRef.current - 1);
    } catch (err) {}
  };

  const handleDeleteNotif = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => {
        const target = prev.find(n => n.id === id);
        if (target && !target.read) {
          setUnreadNotifCount(c => Math.max(0, c - 1));
          prevNotifCountRef.current = Math.max(0, prevNotifCountRef.current - 1);
        }
        return prev.filter(n => n.id !== id);
      });
    } catch (err) {}
  };

  const handleClearAllNotifs = async (e) => {
    if (e) e.stopPropagation();
    try {
      await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadNotifCount(0);
      prevNotifCountRef.current = 0;
    } catch (err) {}
  };

  const handleDeleteChatMessage = async (id) => {
    if (!window.confirm('Delete this customer chat inquiry?')) return;
    try {
      await fetch(`/api/chat/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setChatMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAdminReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer review?')) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete review');
      setReviewsList(prev => prev.filter(r => r.id !== id));
      alert('Review deleted.');
    } catch (err) {
      alert(err.message);
    }
  };

  // Customer Management Handlers
  const handleToggleCustomerPremium = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-premium`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update member status');
      setCustomersList(prev => prev.map(c => c.id === userId ? {
        ...c,
        isPremium: !c.isPremium,
        membershipTier: !c.isPremium ? 'VIP Premium Member' : 'Standard Member'
      } : c));
      alert(data.message);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetCustomerPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordResetFeedback({ success: '', error: 'Password must be at least 6 characters.' });
      return;
    }
    setResettingPassword(true);
    setPasswordResetFeedback({ success: '', error: '' });
    try {
      const res = await fetch(`/api/admin/users/${selectedCustomerForPassword.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      setPasswordResetFeedback({ success: data.message, error: '' });
      setTimeout(() => {
        setSelectedCustomerForPassword(null);
        setNewPasswordInput('');
        setPasswordResetFeedback({ success: '', error: '' });
      }, 1600);
    } catch (err) {
      setPasswordResetFeedback({ success: '', error: err.message });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteCustomer = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete customer account "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete customer');
      setCustomersList(prev => prev.filter(c => c.id !== userId));
      loadAdminData();
      alert(data.message);
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const loggedUser = await login(adminEmail, adminPassword);
      if (loggedUser.role !== 'admin') {
        throw new Error('This account does not have administrator privileges.');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, updates) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order');

      setOrders(prev => prev.map(o => o.id === orderId ? data : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(data);
      }
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // DELETE ORDER
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Permanently delete Order #${orderId}? This cannot be undone.`)) {
      return;
    }

    // Immediately remove from local state for instant UI update
    setOrders(prev => prev.filter(o => o.id !== orderId));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(null);
    }

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadAdminData();
    } catch (err) {
      console.error('Delete order error:', err);
      loadAdminData();
    }
  };

  // PRINT CUSTOMER INVOICE & DISPATCH BILL
  const handlePrintBill = (order) => {
    if (!order) return;
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      alert('Please allow popups in your browser to print customer invoices and bills.');
      return;
    }

    const itemsHtml = (order.items || []).map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 8px; text-align: center; color: #6b7280;">${idx + 1}</td>
        <td style="padding: 10px 8px; font-weight: 600; color: #111827;">${item.productName || item.name || 'Signature Fragrance'}</td>
        <td style="padding: 10px 8px; text-align: center; color: #4b5563;">${item.size || item.variantSize || (item.variantName ? item.variantName : 'Standard')}</td>
        <td style="padding: 10px 8px; text-align: center; color: #111827; font-weight: 600;">${item.quantity || 1}</td>
        <td style="padding: 10px 8px; text-align: right; color: #4b5563;">Rs. ${(item.price || 0).toLocaleString()}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #111827;">Rs. ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
      </tr>
    `).join('');

    const subtotal = (order.items || []).reduce((acc, i) => acc + ((i.price || 0) * (i.quantity || 1)), 0);
    const dealDiscount = Number(order.dealDiscount || 0);
    const dealTitle = order.dealTitle || 'Promotional Deal';
    const isPickup = order.fulfillmentType === 'pickup' || order.deliveryFee === 0;
    const deliveryFee = isPickup ? 0 : (order.deliveryFee !== undefined ? Number(order.deliveryFee) : 500);
    const finalTotal = order.finalTotal || order.totalAmount || Math.max(0, subtotal - dealDiscount + deliveryFee);
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();

    const invoiceContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.id} - SCENTORY.LK</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Montserrat', sans-serif;
              color: #111827;
              margin: 0;
              padding: 40px;
              background: #fff;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .brand-title {
              font-family: 'Cinzel', serif;
              font-size: 26px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #0b0b0e;
              margin: 0;
            }
            .brand-sub {
              font-size: 11px;
              color: #92722a;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-top: 4px;
            }
            .invoice-pill {
              display: inline-block;
              background: #fbf5e6;
              border: 1px solid #d4af37;
              color: #8b6e22;
              font-weight: 700;
              padding: 6px 16px;
              border-radius: 9999px;
              font-size: 12px;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .meta-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 24px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              margin-bottom: 20px;
            }
            .items-table th {
              background: #111827;
              color: #fcf6ba;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 10px 8px;
              text-align: left;
            }
            .totals-table {
              width: 280px;
              margin-left: auto;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .totals-table td {
              padding: 6px 0;
            }
            .total-row {
              border-top: 2px solid #111827;
              font-size: 16px;
              font-weight: 700;
              color: #0b0b0e;
            }
            .badge-verified {
              background: #ecfdf5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              padding: 2px 8px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .footer {
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 11px;
            }
            @media print {
              body { padding: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #d4af37; color: #000; border: none; font-weight: 700; padding: 10px 22px; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              🖨️ Print Invoice / Bill
            </button>
          </div>

          <table class="header-table">
            <tr>
              <td>
                <div class="brand-title">SCENTORY.LK</div>
                <div class="brand-sub">Signature Fragrances • Ulapane, Sri Lanka</div>
                <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">
                  Official WhatsApp & Tel: <strong>+94 76 315 1311</strong> | Instagram: <strong>@scentory.lk</strong>
                </div>
              </td>
              <td style="text-align: right;">
                <div class="invoice-pill">CUSTOMER INVOICE & DISPATCH BILL</div>
                <div style="margin-top: 8px; font-size: 14px; font-weight: 700; color: #111827;">
                  Order #${order.id}
                </div>
                <div style="font-size: 11px; color: #6b7280;">Date: ${orderDate}</div>
              </td>
            </tr>
          </table>

          <div class="meta-box">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 15px;">
                  <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                    CUSTOMER & FULFILLMENT DETAILS
                  </div>
                  <div style="font-size: 14px; font-weight: 700; color: #111827;">${order.customerDetails?.name || 'Customer'}</div>
                  <div style="color: #4b5563; margin-top: 2px;">WhatsApp / Phone: <strong>${order.customerDetails?.phone || 'N/A'}</strong></div>
                  <div style="color: #4b5563;">Email: ${order.customerDetails?.email || order.userEmail || 'N/A'}</div>
                  <div style="color: #4b5563; margin-top: 4px;">
                    ${isPickup ? 'Customer Location:' : 'Shipping Address:'} <strong>${order.customerDetails?.address || 'N/A'}${order.customerDetails?.city ? ', ' + order.customerDetails?.city : ''}</strong>
                  </div>
                  <div style="margin-top: 4px;">
                    Fulfillment Method: <strong style="color: ${isPickup ? '#059669' : '#111827'};">${isPickup ? '🏬 Store / House Pick Up (Ulapane - Free)' : '🚚 Islandwide Courier Delivery'}</strong>
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; border-left: 1px solid #e5e7eb; padding-left: 15px;">
                  <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                    PAYMENT & DISPATCH SUMMARY
                  </div>
                  <div style="color: #4b5563;">Payment: <strong>Direct Bank Deposit / Transfer</strong></div>
                  <div style="color: #4b5563; margin-top: 2px;">Bank: <strong>Commercial Bank of Ceylon</strong></div>
                  <div style="margin-top: 4px;">
                    Slip Status: 
                    <span class="badge-verified">${order.paymentStatus === 'verified' ? '✓ Bank Slip Verified' : (order.paymentStatus === 'rejected' ? '✗ Slip Rejected' : 'Awaiting Slip Verification')}</span>
                  </div>
                  <div style="color: #4b5563; margin-top: 4px;">
                    Order Status: <strong style="text-transform: uppercase;">${order.orderStatus || 'Processing'}</strong>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Fragrance Description</th>
                <th style="width: 90px; text-align: center;">Size</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 100px; text-align: right;">Unit Price</th>
                <th style="width: 110px; text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #4b5563;">Items Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">Rs. ${subtotal.toLocaleString()}</td>
            </tr>
            ${dealDiscount > 0 ? `
            <tr>
              <td style="color: #059669; font-weight: 600;">Promotion (${dealTitle}):</td>
              <td style="text-align: right; font-weight: 700; color: #059669;">- Rs. ${dealDiscount.toLocaleString()}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #4b5563;">Fulfillment (${isPickup ? 'Store Pick Up at Ulapane' : 'Islandwide Courier Delivery'}):</td>
              <td style="text-align: right; font-weight: 600; color: ${isPickup ? '#059669' : '#111827'};">
                ${isPickup ? 'FREE (Rs. 0)' : 'Rs. ' + deliveryFee.toLocaleString()}
              </td>
            </tr>
            <tr class="total-row">
              <td style="padding-top: 8px;">Grand Total (LKR):</td>
              <td style="padding-top: 8px; text-align: right; color: #0b0b0e;">Rs. ${finalTotal.toLocaleString()}</td>
            </tr>
          </table>

          <div style="margin-top: 25px; padding: 14px; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 8px; font-size: 11px; color: #92400e;">
            <strong>Dispatch Guarantee:</strong> Handcrafted and packaged in Ulapane, Sri Lanka using clinical glass atomizers. Guaranteed 100% genuine niche & designer perfume extrait.
          </div>

          <div class="footer">
            <p style="margin: 0; font-weight: 600; color: #111827;">Thank you for your order with SCENTORY.LK!</p>
            <p style="margin: 4px 0 0 0;">For inquiries or signature re-orders, reach out via WhatsApp at 0763151311 or Instagram @scentory.lk</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  };

  // Handle Product Save (Create or Update)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingProduct?.id);
      const url = isEdit ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = { ...productForm };
      delete payload._notesDraft;

      // When Special Offer is disabled, variants cannot have discount prices
      if (!payload.isSpecialOffer) {
        payload.variants = (payload.variants || []).map(v => ({
          ...v,
          discountPrice: null
        }));
      } else {
        payload.variants = (payload.variants || []).map(v => ({
          ...v,
          discountPrice: v.discountPrice !== '' && v.discountPrice != null && Number(v.discountPrice) > 0 ? Number(v.discountPrice) : null
        }));
      }

      if (!payload.name || !payload.name.trim()) {
        alert('Please enter a fragrance title.');
        return;
      }
      if (!payload.variants || !payload.variants.length) {
        alert('Please add at least one bottle size variant (e.g. 10ml, 20ml, 50ml, 100ml) with pricing.');
        return;
      }
      const hasInvalidPrice = payload.variants.some(v => !v.price || Number(v.price) <= 0);
      if (hasInvalidPrice) {
        alert('Every bottle size variant must have a valid price in LKR.');
        return;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save fragrance.');

      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this fragrance from the store?')) return;
    try {
      // Optimistic UI update: instantly remove from list
      setProducts(prev => prev.filter(p => p.id !== productId));
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Treat 200 OK or 404 (already deleted in cloud DB) as success
      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to delete product.');
      }
      loadAdminData();
    } catch (err) {
      alert(err.message);
      loadAdminData();
    }
  };

  // Handle Image Upload via Multer
  const handleImageFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
        setUploadingImage(false);
      };
      reader.onerror = () => {
        alert('Failed to read image file.');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert(err.message || 'Error processing image.');
      setUploadingImage(false);
    }
  };

  // Add Image URL
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setProductForm(prev => ({
      ...prev,
      images: [...(prev.images || []), imageUrlInput.trim()]
    }));
    setImageUrlInput('');
  };

  // Remove Image
  const handleRemoveImage = (indexToRemove) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Promotional Deal Poster / Flyer Image Handlers
  const handleDealImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDealImage(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setSettings(prev => ({
          ...prev,
          promotionalDeal: {
            ...(prev?.promotionalDeal || {}),
            imageUrl: reader.result
          }
        }));
        setUploadingDealImage(false);
      };
      reader.onerror = () => {
        alert('Failed to read poster image file.');
        setUploadingDealImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert(err.message || 'Error processing deal poster image.');
      setUploadingDealImage(false);
    }
  };

  const handleAddDealImageUrl = () => {
    if (!dealImageUrlInput.trim()) return;
    setSettings(prev => ({
      ...prev,
      promotionalDeal: {
        ...(prev?.promotionalDeal || {}),
        imageUrl: dealImageUrlInput.trim()
      }
    }));
    setDealImageUrlInput('');
  };

  const handleRemoveDealImage = () => {
    setSettings(prev => ({
      ...prev,
      promotionalDeal: {
        ...(prev?.promotionalDeal || {}),
        imageUrl: ''
      }
    }));
  };

  // Variant Add/Remove/Update
  const handleAddVariant = () => {
    const newVariant = {
      id: 'var_' + Date.now(),
      size: '10ml Spray',
      price: 3500,
      discountPrice: null,
      stock: 20,
      sku: 'SKU-' + Math.floor(100 + Math.random() * 900)
    };
    setProductForm(prev => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant]
    }));
  };

  const handleUpdateVariant = (index, field, value) => {
    setProductForm(prev => {
      const updated = [...prev.variants];
      updated[index] = {
        ...updated[index],
        [field]: field === 'price' || field === 'discountPrice' || field === 'stock'
          ? (value === '' ? '' : Number(value))
          : value
      };
      return { ...prev, variants: updated };
    });
  };

  const handleRemoveVariant = (index) => {
    if (productForm.variants.length <= 1) {
      alert('A product must have at least one variant.');
      return;
    }
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  // Quick Stock Update
  const handleQuickStockSave = async (productId, variantId, newStock) => {
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ variantId, stock: Number(newStock) })
      });
      if (!res.ok) throw new Error('Stock update failed');
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Dedicated Individual Variant Stock Update with Instant Feedback
  const handleUpdateVariantStock = async (productId, variantId, qty) => {
    try {
      const numQty = Math.max(0, parseInt(qty, 10) || 0);
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ variantId, stock: numQty })
      });
      if (!res.ok) throw new Error('Failed to update variant stock.');

      // Update local products state immediately
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        return {
          ...p,
          variants: (p.variants || []).map(v => v.id === variantId ? { ...v, stock: numQty } : v)
        };
      }));

      // Flash success badge for this variant
      setStockUpdateFeedback(prev => ({ ...prev, [variantId]: true }));
      setTimeout(() => {
        setStockUpdateFeedback(prev => ({ ...prev, [variantId]: false }));
      }, 2500);

      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...settings };
      if (!payload.storeName || !payload.storeName.trim()) {
        alert('Please provide a store brand name.');
        return;
      }
      if (payload.promotionalDeal?.enabled && payload.promotionalDeal?.appliesTo === 'specific') {
        const selected = Array.isArray(payload.promotionalDeal?.applicableProductIds)
          ? payload.promotionalDeal.applicableProductIds
          : [];
        if (selected.length === 0) {
          alert('Please select at least one fragrance to apply this promotion to, or switch to "All Fragrances (Storewide)".');
          return;
        }
      }
      payload.deliveryFee = Math.max(0, Number(payload.deliveryFee) || 0);
      payload.bankDetails = {
        bankName: 'Commercial Bank',
        accountName: 'S M Suhail',
        accountNumber: '8021353334',
        branch: 'Gampola Branch',
        swiftCode: 'CCEYLKX',
        instructions: 'Please transfer the exact total amount and use your name or phone number as the payment reference. Upload the screenshot/receipt slip below.'
      };

      if (payload.heroVideoUrl && typeof payload.heroVideoUrl === 'string' && payload.heroVideoUrl.startsWith('data:video')) {
        payload.heroVideoUrl = '/hero-uploaded-video.mp4';
        setSettings(prev => ({ ...prev, heroVideoUrl: '/hero-uploaded-video.mp4' }));
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update settings');

      const newSettings = data.settings || payload;
      try {
        localStorage.setItem('scentory_settings', JSON.stringify(newSettings));
      } catch (e) {}

      // Broadcast instant update to all views and browser tabs
      window.dispatchEvent(new CustomEvent('scentory-settings-updated', { detail: newSettings }));
      try {
        const channel = new BroadcastChannel('scentory_channel');
        channel.postMessage({ type: 'SETTINGS_UPDATED', settings: newSettings });
        channel.close();
      } catch (e) {}

      alert('Store & Bank Settings saved successfully and updated live on the website!');
    } catch (err) {
      alert(err.message);
    }
  };

  // Export Sales Report to CSV
  const handleExportCSV = () => {
    if (!orders || orders.length === 0) return;
    const rows = [
      ['Order ID', 'Date', 'Customer Name', 'Phone', 'Items Count', 'Total (LKR)', 'Payment Status', 'Order Status']
    ];
    orders.forEach(o => {
      rows.push([
        o.id,
        o.createdAt.split('T')[0],
        `"${o.customerDetails.name}"`,
        `"${o.customerDetails.phone}"`,
        o.items.length,
        o.finalTotal,
        o.paymentStatus,
        o.orderStatus
      ]);
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scentory_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // IF NOT ADMIN, RENDER DISCRETE ADMIN AUTH PORTAL
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-[#d4af37]/40 shadow-2xl animate-in zoom-in-95">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full border border-[#d4af37] p-1 mx-auto mb-3 bg-black/60 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <img src="/brand-logo.png" alt="SCENTORY.LK" className="w-full h-full object-cover rounded-full" />
            </div>
            <h1 className="font-serif-luxury text-2xl font-bold gold-text-gradient uppercase tracking-widest">
              Administrator Portal
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Authorized Personnel Only
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-xs text-red-200">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                Master Security Key
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter master security key"
                className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] cursor-pointer"
            >
              {loginLoading ? 'Authenticating...' : 'Access Admin Workspace'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <button
              onClick={onBackToShop}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              ← Return to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ISOLATED FULL-SCREEN ADMIN WORKSPACE (NO STORE NAVBAR, NO STORE FOOTER)
  return (
    <div className="min-h-screen bg-[#070709] text-gray-100 flex flex-col font-sans-clean">
      {/* Top Exclusive Admin Bar */}
      <div className="bg-[#101016] border-b border-[#d4af37]/30 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[#d4af37]/60 p-0.5 overflow-hidden bg-black">
            <img src="/brand-logo.png" alt="Scentory" className="w-full h-full object-cover rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-luxury text-base font-bold gold-text-gradient uppercase tracking-widest">
                SCENTORY.LK
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#d4af37] text-black">
                ADMIN CONSOLE
              </span>
            </div>
            <span className="text-[10px] text-gray-400">Exclusive Store Management Workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Live Auto-Sync / Auto-Refresh Console Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14141c] border border-[#d4af37]/30 text-gray-300">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${autoSyncInterval !== '0' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-[11px] font-semibold tracking-wider text-gray-200">
                {autoSyncInterval !== '0' ? 'LIVE SYNC' : 'MANUAL'}
              </span>
            </div>
            <span className="text-gray-600">|</span>
            <select
              value={autoSyncInterval}
              onChange={(e) => {
                setAutoSyncInterval(e.target.value);
                localStorage.setItem('scentory_admin_autosync', e.target.value);
              }}
              title="Change Auto-Refresh Frequency"
              className="bg-black/60 border border-[#d4af37]/40 rounded-lg px-2 py-0.5 text-[11px] text-[#fcf6ba] font-medium focus:outline-none focus:border-[#d4af37] cursor-pointer"
            >
              <option value="30" className="bg-[#101016] text-white">Every 30s</option>
              <option value="60" className="bg-[#101016] text-white">Every 1 min</option>
              <option value="120" className="bg-[#101016] text-white">Every 2 mins</option>
              <option value="300" className="bg-[#101016] text-white">Every 5 mins</option>
              <option value="600" className="bg-[#101016] text-white">Every 10 mins</option>
              <option value="0" className="bg-[#101016] text-white">Paused (Manual)</option>
            </select>
            <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
              ({timeAgo})
            </span>
            <button
              onClick={() => loadAdminData(true)}
              disabled={isSyncing}
              title="Click to fetch newest orders & stats immediately without refreshing browser"
              className="p-1 rounded-lg bg-[#d4af37]/15 hover:bg-[#d4af37]/30 text-[#fcf6ba] border border-[#d4af37]/40 transition-all cursor-pointer flex items-center gap-1 px-2"
            >
              <RefreshCw className={`w-3 h-3 text-[#d4af37] ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-bold">Sync Now</span>
            </button>
          </div>

          {/* Mobile Refresh Icon */}
          <button
            onClick={() => loadAdminData(true)}
            disabled={isSyncing}
            title={`Auto-syncing every ${autoSyncInterval}s. Click to refresh now.`}
            className="sm:hidden p-2 rounded-xl bg-[#14141c] border border-[#d4af37]/40 hover:border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/15 transition-all cursor-pointer flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 text-[#d4af37] ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Real-time Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title="Real-time Admin Notifications"
              className="relative p-2 rounded-xl bg-[#14141c] border border-[#d4af37]/40 hover:border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/15 transition-all cursor-pointer flex items-center justify-center"
            >
              <Bell className="w-4 h-4 text-[#d4af37]" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono bg-rose-500 text-white shadow-lg animate-bounce">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel bg-[#0d0d14]/98 rounded-2xl border border-[#d4af37]/40 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/20 mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#d4af37]" />
                    <span className="font-bold text-xs uppercase tracking-wider text-white">Live Notifications ({notifications.length})</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllNotifsRead}
                        className="text-[10px] text-[#fcf6ba] hover:underline cursor-pointer font-medium"
                        title="Mark all notifications as read"
                      >
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAllNotifs}
                        className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-medium"
                        title="Delete and clear all notifications"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          handleMarkNotifRead(n.id);
                          if (n.type === 'order') setActiveTab('orders');
                          if (n.type === 'user') setActiveTab('customers');
                          setIsNotifOpen(false);
                        }}
                        className={`group relative p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          !n.read 
                            ? 'bg-[#181824] border-[#d4af37]/40 text-white shadow-md' 
                            : 'bg-black/30 border-white/5 text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="font-bold text-[#fcf6ba] text-[11px] flex items-center gap-1.5 truncate">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse flex-shrink-0" />}
                            {n.title}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[9px] text-gray-500">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {/* Read / Unread toggle check button */}
                            {!n.read ? (
                              <button
                                onClick={(e) => handleMarkNotifRead(n.id, e)}
                                title="Mark as read"
                                className="px-1.5 py-0.5 rounded bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#d4af37] hover:text-black font-semibold text-[9px] flex items-center gap-0.5 transition-colors cursor-pointer"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Read</span>
                              </button>
                            ) : (
                              <span className="text-[9px] text-emerald-400 font-medium">Read</span>
                            )}
                            {/* Delete / Remove button */}
                            <button
                              onClick={(e) => handleDeleteNotif(n.id, e)}
                              title="Delete notification"
                              className="p-1 rounded bg-white/5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-300 pr-2">{n.message}</p>
                        {n.code && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 p-2 rounded-lg bg-black/60 border border-[#d4af37]/40 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 uppercase font-mono">Code:</span>
                              <span className="font-mono text-sm font-bold text-[#fcf6ba] tracking-widest bg-white/5 px-2 py-0.5 rounded border border-[#d4af37]/30">
                                {n.code}
                              </span>
                            </div>
                            {n.customerPhone ? (
                              <a
                                href={`https://wa.me/${String(n.customerPhone).replace(/[^0-9]/g, '')}?text=Hello,%20your%20SCENTORY.LK%20password%20reset%20verification%20code%20is:%20${n.code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Send WhatsApp</span>
                              </a>
                            ) : (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(n.code);
                                  alert('Verification code ' + n.code + ' copied to clipboard!');
                                }}
                                className="px-2 py-1 rounded bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#d4af37] hover:text-black text-[10px] font-semibold transition-colors flex-shrink-0 cursor-pointer"
                              >
                                Copy Code
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onBackToShop}
            className="px-3.5 py-1.5 rounded-xl border border-white/15 hover:border-[#d4af37] text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            View Customer Store
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 hover:bg-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Real-Time Order Toast Alert */}
      {newOrderBanner && (
        <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-b border-[#d4af37]/50 px-6 py-2.5 flex items-center justify-between text-xs text-white z-30 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-[#fcf6ba] uppercase tracking-wider">🔔 New Order Alert:</span>
            <span>{newOrderBanner}</span>
          </div>
          <button
            onClick={() => {
              setActiveTab('orders');
              setNewOrderBanner(null);
            }}
            className="px-3 py-1 rounded-lg bg-[#d4af37] text-black font-bold text-[11px] hover:bg-[#fcf6ba] transition-all cursor-pointer"
          >
            View in Orders →
          </button>
        </div>
      )}

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Admin Navigation Sidebar (Fixed Width, Never Shrinks on Any Page) */}
        <aside className="w-full md:w-64 flex-shrink-0 shrink-0 min-w-[256px] glass-panel rounded-2xl border border-[#d4af37]/25 p-3 space-y-1.5 self-start sticky top-24 select-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 flex-shrink-0" />
              <span>Orders & Verification</span>
            </div>
            {stats?.pendingVerificationCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'orders' ? 'bg-black text-[#d4af37]' : 'bg-amber-500 text-black'}`}>
                {stats.pendingVerificationCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 flex-shrink-0" />
            <span>Products & ML Sizes</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'stock'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              <span>Stock Inventory</span>
            </div>
            {stats?.lowStockAlerts?.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'stock' ? 'bg-black text-rose-400' : 'bg-rose-500 text-white'}`}>
                {stats.lowStockAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Customers</span>
            </div>
            {customersList.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'customers' ? 'bg-black text-[#d4af37]' : 'bg-white/10 text-gray-300'}`}>
                {customersList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 flex-shrink-0" />
              <span>Customer Reviews</span>
            </div>
            {reviewsList.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'reviews' ? 'bg-black text-[#d4af37]' : 'bg-white/10 text-gray-300'}`}>
                {reviewsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span>Sales Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('deals')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'deals'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4 flex-shrink-0" />
            <span>Promotions & Deals</span>
            {settings?.promotionalDeal?.enabled && (
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Deal Active" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#d4af37] text-black shadow-lg font-bold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Bank & Store Settings</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6 animate-in fade-in">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-[#d4af37]/25">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Verified Revenue
                  </span>
                  <div className="font-serif-luxury text-2xl font-bold gold-text-gradient">
                    Rs. {stats.totalRevenue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-400 mt-1 block">From confirmed bank deposits</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-[#d4af37]/25">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Awaiting Slip Check
                  </span>
                  <div className="font-serif-luxury text-2xl font-bold text-amber-400">
                    {stats.pendingVerificationCount} Orders
                  </div>
                  <span className="text-[10px] text-amber-300/80 mt-1 block">Inspect customer slips</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-[#d4af37]/25">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Total Store Orders
                  </span>
                  <div className="font-serif-luxury text-2xl font-bold text-white">
                    {stats.totalOrders}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Active order volume</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-[#d4af37]/25">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Low Stock Variant Alerts
                  </span>
                  <div className="font-serif-luxury text-2xl font-bold text-rose-400">
                    {stats.lowStockAlerts.length}
                  </div>
                  <span className="text-[10px] text-rose-300/80 mt-1 block">≤ 10 bottles remaining</span>
                </div>
              </div>

              {/* Top Selling Fragrances Snapshot */}
              <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/25">
                <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Top-Performing Fragrances (Automatic Trending)</span>
                  <span className="text-xs font-sans text-[#d4af37]">Live Order Metrics</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {stats.topProducts && stats.topProducts.length > 0 ? (
                    stats.topProducts.map((p) => (
                      <div key={p.id} className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-3">
                        <img src={p.image || '/brand-logo.png'} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-white truncate block">{p.name}</span>
                          <span className="text-[10px] text-gray-400">{p.scentFamily}</span>
                          <span className="text-[11px] text-[#f3e5ab] font-bold block mt-0.5">{p.salesCount || 0} Bottles Sold</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-5 text-center text-xs text-gray-400 tracking-wide">
                      No bottle sales recorded yet. Once customer orders are placed, live metrics appear here automatically.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/25">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider">
                    Recent Customer Orders
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                  >
                    View All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="pb-3">Order ID</th>
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">WhatsApp</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Slip Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.recentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-white/5">
                          <td className="py-3 font-mono font-bold text-white">{order.id}</td>
                          <td className="py-3 text-gray-200">{order.customerDetails.name}</td>
                          <td className="py-3 text-[#d4af37] font-mono">{order.customerDetails.phone}</td>
                          <td className="py-3 font-bold text-[#f3e5ab]">Rs. {order.finalTotal.toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              order.paymentStatus === 'verified'
                                ? 'bg-emerald-950 text-emerald-400'
                                : order.paymentStatus === 'rejected'
                                ? 'bg-rose-950 text-rose-400'
                                : 'bg-amber-950 text-amber-400'
                            }`}>
                              {order.paymentStatus === 'pending_verification' ? 'Pending Check' : order.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setActiveTab('orders');
                              }}
                              className="px-2.5 py-1 rounded bg-[#181824] hover:bg-[#d4af37] hover:text-black text-gray-300 text-[11px] transition-colors cursor-pointer"
                            >
                              Inspect Order
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS MANAGEMENT WITH SLIP VERIFICATION & DELETE CAPABILITY */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider">
                    Customer Orders & Bank Slips
                  </h2>
                  <p className="text-xs text-gray-400">
                    Verify uploaded customer deposit slips, reject fake receipts, update delivery status, or delete spam orders.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadAdminData(true)}
                    disabled={isSyncing}
                    title="Silently re-fetch latest orders from Supabase without page reload"
                    className="px-3.5 py-2 rounded-xl bg-[#161622] border border-[#d4af37]/30 hover:border-[#d4af37] text-xs font-semibold text-[#f3e5ab] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#d4af37] ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Orders ({timeAgo})</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-xl bg-[#161622] border border-[#d4af37]/30 hover:border-[#d4af37] text-xs font-semibold text-[#f3e5ab] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Export CSV Report</span>
                  </button>
                </div>
              </div>

              {/* Date Filter & Verified Revenue Metrics Bar */}
              <div className="p-4 rounded-2xl bg-[#121218] border border-[#d4af37]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mr-1">
                    <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Filter Date:</span>
                  </span>
                  
                  {[
                    { id: 'all', label: 'All Orders' },
                    { id: 'today', label: 'Today' },
                    { id: '7days', label: 'Last 7 Days' },
                    { id: '30days', label: 'This Month' },
                    { id: 'custom', label: 'Custom Range' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderDateFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                        orderDateFilter === f.id
                          ? 'bg-[#d4af37] text-black font-bold shadow-md'
                          : 'bg-[#181822] text-gray-300 hover:text-white border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Inputs */}
                {orderDateFilter === 'custom' && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[10px]">From:</span>
                      <input
                        type="date"
                        value={dateFilterFrom}
                        onChange={(e) => setDateFilterFrom(e.target.value)}
                        className="px-2 py-1 rounded-lg bg-[#181822] border border-white/10 text-white text-xs outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[10px]">To:</span>
                      <input
                        type="date"
                        value={dateFilterTo}
                        onChange={(e) => setDateFilterTo(e.target.value)}
                        className="px-2 py-1 rounded-lg bg-[#181822] border border-white/10 text-white text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Filter Summary Stats */}
                <div className="flex items-center gap-4 text-xs font-mono ml-auto">
                  <span className="text-gray-400">
                    Showing: <strong className="text-white">{filteredOrders.length}</strong> orders
                  </span>
                  <span className="text-gray-400 border-l border-white/10 pl-3">
                    Verified Revenue: <strong className="text-[#fcf6ba] font-bold">Rs. {filteredVerifiedRevenue.toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {/* Orders Table */}
              <div className="glass-panel rounded-2xl border border-[#d4af37]/25 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121218] border-b border-[#d4af37]/20 text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Order ID & Date</th>
                        <th className="p-4">Customer & WhatsApp</th>
                        <th className="p-4">Items & Sizes</th>
                        <th className="p-4">Total Amount</th>
                        <th className="p-4">Slip Status</th>
                        <th className="p-4">Fulfillment</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">
                            No orders found matching the selected date filter.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(order => {
                          const customerName = order.customerDetails?.name || order.customerName || 'Customer';
                          const customerPhone = order.customerDetails?.phone || order.phone || '';
                          const customerCity = order.customerDetails?.city || order.city || 'Sri Lanka';
                          const orderDateStr = order.createdAt ? String(order.createdAt).split('T')[0] : 'N/A';
                          const orderTotal = Number(order.finalTotal || order.totalAmount || 0);
                          const items = Array.isArray(order.items) ? order.items : [];

                          return (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <span className="font-mono font-bold text-white text-sm block">{order.id}</span>
                                <span className="text-[10px] text-gray-400">{orderDateStr}</span>
                              </td>
                              <td className="p-4">
                                <span className="font-semibold text-gray-200 block">{customerName}</span>
                                {customerPhone && (
                                  <a
                                    href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                                  >
                                    <span>{customerPhone}</span>
                                  </a>
                                )}
                                <span className="text-[10px] text-gray-500 block truncate max-w-[140px]">{customerCity}</span>
                                {order.fulfillmentType === 'pickup' || order.deliveryFee === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded-full mt-1">
                                    🏬 Pick Up (Rs. 0)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full mt-1">
                                    🚚 Delivery (Rs. 500)
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="space-y-0.5">
                                  {items.map((it, i) => (
                                    <div key={i} className="text-[11px] text-gray-300">
                                      {it.quantity || 1}x {it.productName || 'Fragrance'} {it.variantSize ? `(${String(it.variantSize).split(' ')[0]})` : ''}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="font-serif-luxury font-bold text-[#f3e5ab] text-sm block">
                                  Rs. {orderTotal.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-block ${
                                  order.paymentStatus === 'verified'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                    : order.paymentStatus === 'rejected'
                                    ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-950 text-amber-400 border border-amber-500/30 animate-pulse'
                                }`}>
                                  {order.paymentStatus === 'pending_verification' ? 'Pending Check' : (order.paymentStatus || 'pending')}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="text-gray-300 font-medium uppercase text-[11px]">
                                  {order.orderStatus || 'pending'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handlePrintBill(order)}
                                    className="px-3 py-1.5 rounded-lg bg-[#14141c] hover:bg-[#d4af37]/20 border border-[#d4af37]/40 hover:border-[#d4af37] text-[#fcf6ba] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                    title="Print Customer Invoice & Bill"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-[#d4af37]" />
                                    <span>Print Bill</span>
                                  </button>
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 shadow-md cursor-pointer"
                                  >
                                    Inspect & Slip
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer"
                                    title="Delete Order"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DETAILED ORDER & SLIP INSPECTOR MODAL */}
              {selectedOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="relative w-full max-w-3xl glass-panel bg-[#0d0d12] rounded-3xl border border-[#d4af37]/40 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/20">
                      <div>
                        <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                          Order Management & Bank Slip Check
                        </span>
                        <h3 className="font-mono text-2xl font-bold text-white">
                          {selectedOrder.id}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePrintBill(selectedOrder)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          title="Print Customer Invoice & Bill"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Bill</span>
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(selectedOrder.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Order</span>
                        </button>
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Customer & Delivery Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-black/40 p-4 rounded-xl border border-white/5">
                      <div>
                        <span className="text-gray-400 uppercase font-semibold block text-[10px] mb-1">Customer Details</span>
                        <p className="text-white font-medium text-sm">{selectedOrder.customerDetails?.name || selectedOrder.customerName || 'Customer'}</p>
                        <p className="text-gray-300">{selectedOrder.customerDetails?.email || selectedOrder.email || 'N/A'}</p>
                        {(selectedOrder.customerDetails?.phone || selectedOrder.phone) && (
                          <div className="mt-2 flex items-center gap-2">
                            <a
                              href={`https://wa.me/${formatLKPhone(selectedOrder.customerDetails?.phone || selectedOrder.phone)}?text=${encodeURIComponent(`Hello ${selectedOrder.customerDetails?.name || 'Customer'}, contacting you regarding your SCENTORY.LK order #${selectedOrder.id}...`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-[11px] inline-flex items-center gap-1"
                            >
                              <span>Chat on WhatsApp: {selectedOrder.customerDetails?.phone || selectedOrder.phone}</span>
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-gray-400 uppercase font-semibold text-[10px]">
                            {selectedOrder.fulfillmentType === 'pickup' ? 'Fulfillment: Store Pick Up' : 'Fulfillment: Courier Delivery'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            selectedOrder.fulfillmentType === 'pickup'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}>
                            {selectedOrder.fulfillmentType === 'pickup' ? '🏬 Free Pick Up (Ulapane)' : '🚚 Delivery (Rs. 500)'}
                          </span>
                        </div>
                        <span className="text-gray-400 uppercase font-semibold block text-[10px] mb-0.5">
                          {selectedOrder.fulfillmentType === 'pickup' ? 'Customer Location' : 'Delivery Destination'}
                        </span>
                        <p className="text-white font-medium">{selectedOrder.customerDetails?.address || 'N/A'}</p>
                        <p className="text-gray-300">{selectedOrder.customerDetails?.city || ''} {selectedOrder.customerDetails?.postalCode || ''}</p>
                        {selectedOrder.customerDetails?.notes && (
                          <p className="text-amber-300 mt-1 italic">Note: "{selectedOrder.customerDetails.notes}"</p>
                        )}
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase tracking-wider text-gray-300 font-semibold">Purchased Items & Sizes</h4>
                      <div className="divide-y divide-white/5 bg-[#14141c] p-4 rounded-xl border border-white/5">
                        {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item, i) => (
                          <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <img src={item.image} alt="" className="w-10 h-10 object-cover rounded-lg border border-white/10" />
                              <div>
                                <span className="text-white font-medium">{item.productName}</span>
                                <span className="text-[10px] text-[#d4af37] block">{item.variantSize} x {item.quantity}</span>
                              </div>
                            </div>
                            <span className="text-white font-semibold">Rs. {Number(item.subtotal || 0).toLocaleString()}</span>
                          </div>
                        ))}
                        {Number(selectedOrder.dealDiscount || 0) > 0 && (
                          <div className="pt-2 flex justify-between text-xs text-emerald-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Gift className="w-3.5 h-3.5" />
                              <span>Promotional Savings ({selectedOrder.dealTitle || 'Promotional Deal'}):</span>
                            </span>
                            <span className="font-bold">- Rs. {Number(selectedOrder.dealDiscount).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="pt-3 flex justify-between font-bold text-sm">
                          <span className="text-gray-300">Final Order Total:</span>
                          <span className="gold-text-gradient">Rs. {Number(selectedOrder.finalTotal || selectedOrder.totalAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* UPLOADED PAYMENT RECEIPT SLIP INSPECTION */}
                    <div className="p-5 rounded-2xl bg-[#14141e] border border-[#d4af37]/30 space-y-4 shadow-lg">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                        <h4 className="font-serif-luxury text-sm font-bold text-[#f3e5ab] uppercase tracking-wider flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-[#d4af37]" />
                          <span>Customer Payment Deposit Slip</span>
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400">Payment Status:</span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            selectedOrder.paymentStatus === 'verified'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : selectedOrder.paymentStatus === 'rejected'
                              ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-950 text-amber-400 border border-amber-500/40 animate-pulse'
                          }`}>
                            {selectedOrder.paymentStatus === 'verified' ? '✓ Verified Payment' : selectedOrder.paymentStatus === 'rejected' ? '✗ Fake / Rejected' : '⏳ Awaiting Review'}
                          </span>
                        </div>
                      </div>

                      {/* Slip Rendering (PDF or Image) */}
                      {selectedOrder.bankSlipUrl ? (
                        selectedOrder.bankSlipUrl.startsWith('data:application/pdf') || selectedOrder.bankSlipUrl.endsWith('.pdf') ? (
                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-[#1c1c28] border border-[#d4af37]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-rose-950/70 border border-rose-500/40 flex items-center justify-center text-rose-300 font-bold text-xs uppercase">
                                  PDF
                                </div>
                                <div>
                                  <h5 className="font-semibold text-white text-xs">Official Bank Deposit Slip (PDF)</h5>
                                  <p className="text-[10px] text-gray-400">Uploaded by customer via checkout</p>
                                </div>
                              </div>
                              <a
                                href={selectedOrder.bankSlipUrl}
                                download={`Bank_Slip_${selectedOrder.id}.pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 rounded-xl bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open Full PDF Document</span>
                              </a>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-white/10 h-80 bg-white">
                              <iframe
                                src={selectedOrder.bankSlipUrl}
                                title="Bank Slip PDF"
                                className="w-full h-full"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="max-h-80 overflow-hidden rounded-xl border border-white/10 bg-black/60 flex items-center justify-center p-2 relative group">
                              <img
                                src={selectedOrder.bankSlipUrl}
                                alt="Bank Transfer Slip"
                                className="max-h-72 object-contain rounded-lg cursor-pointer hover:scale-102 transition-transform"
                                onClick={() => setPreviewSlipUrl(selectedOrder.bankSlipUrl)}
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewSlipUrl(selectedOrder.bankSlipUrl)}
                                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md text-[#d4af37] border border-[#d4af37]/40 text-xs font-semibold flex items-center gap-1.5 shadow-lg cursor-pointer hover:bg-black"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Click to Enlarge</span>
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="p-6 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
                          <p className="text-rose-400 text-xs font-semibold">No bank slip file attached to this order.</p>
                        </div>
                      )}

                      {/* Unified One-Click Verification Controls */}
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        <label className="block text-[11px] uppercase tracking-wider text-gray-300 font-bold">
                          Quick Verification Actions
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, { paymentStatus: 'verified', orderStatus: 'processing', adminNotes: 'Bank slip verified by Admin.' })}
                            className={`py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                              selectedOrder.paymentStatus === 'verified'
                                ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                : 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            <span>✓ Approve Payment</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, { paymentStatus: 'pending_verification', orderStatus: 'placed' })}
                            className={`py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                              selectedOrder.paymentStatus === 'pending_verification'
                                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                : 'bg-amber-950/70 border border-amber-500/40 text-amber-300 hover:bg-amber-600 hover:text-white'
                            }`}
                          >
                            <span>⏳ Under Review</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, { paymentStatus: 'rejected', orderStatus: 'cancelled', adminNotes: 'Bank slip rejected: Fake or invalid.' })}
                            className={`py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                              selectedOrder.paymentStatus === 'rejected'
                                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                                : 'bg-rose-950/70 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white'
                            }`}
                          >
                            <span>✕ Reject Fake Slip</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Customer WhatsApp 1-Click Instant Updates */}
                    <div className="p-4 rounded-2xl bg-[#14141c] border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>1-Click Customer WhatsApp Updates</span>
                        </label>
                        <span className="text-[10px] text-gray-400">100% Free Direct Message</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Notify Payment Verified */}
                        <button
                          type="button"
                          onClick={() => {
                            const rawPhone = selectedOrder.customerDetails?.phone || selectedOrder.phone;
                            const phone = formatLKPhone(rawPhone);
                            const name = selectedOrder.customerDetails?.name || selectedOrder.customerName || 'Customer';
                            const orderId = selectedOrder.id;
                            const total = (selectedOrder.totalAmount || selectedOrder.finalTotal || 0).toLocaleString();
                            const isPickup = selectedOrder.fulfillmentType === 'pickup' || selectedOrder.deliveryFee === 0;
                            const prepNote = isPickup
                              ? 'Your signature fragrances are now being hand-decanted and prepared for local pick up at our Ulapane location.'
                              : 'Your signature fragrances are now being hand-decanted and prepared for courier dispatch.';
                            const msg = encodeURIComponent(
                              `*PAYMENT VERIFIED - SCENTORY.LK*\n\n` +
                              `Dear ${name},\n\n` +
                              `Your bank transfer payment for Order *#${orderId}* (Rs. ${total}) has been verified by our accounts team! ✨\n\n` +
                              `${prepNote}\n\n` +
                              `Thank you for choosing SCENTORY.LK!`
                            );
                            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>WhatsApp: Payment Verified</span>
                        </button>

                        {/* Notify Order Dispatched OR Ready for Pick Up */}
                        <button
                          type="button"
                          onClick={() => {
                            const rawPhone = selectedOrder.customerDetails?.phone || selectedOrder.phone;
                            const phone = formatLKPhone(rawPhone);
                            const name = selectedOrder.customerDetails?.name || selectedOrder.customerName || 'Customer';
                            const orderId = selectedOrder.id;
                            const address = selectedOrder.customerDetails?.address || 'your destination address';
                            const isPickup = selectedOrder.fulfillmentType === 'pickup' || selectedOrder.deliveryFee === 0;

                            const msg = isPickup
                              ? encodeURIComponent(
                                  `*ORDER READY FOR PICK UP - SCENTORY.LK*\n\n` +
                                  `Dear ${name},\n\n` +
                                  `Great news! Your fragrance order *#${orderId}* is now freshly decanted and ready for pick up at our Ulapane location! ✨\n\n` +
                                  `Customer Location on file: ${address}\n\n` +
                                  `Please reply to this chat when you are on your way or when you arrive to collect your order. Thank you for choosing SCENTORY.LK!`
                                )
                              : encodeURIComponent(
                                  `*ORDER DISPATCHED - SCENTORY.LK*\n\n` +
                                  `Dear ${name},\n\n` +
                                  `Great news! Your fragrance order *#${orderId}* has been dispatched via verified courier for island-wide delivery to:\n` +
                                  `📍 ${address}\n\n` +
                                  `Please ensure someone is available at the delivery location. Feel free to reply here if you have any questions!\n\n` +
                                  `SCENTORY.LK • Luxury Fragrances`
                                );
                            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-blue-950/80 border border-blue-500/40 hover:bg-blue-600 hover:text-white text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>
                            {selectedOrder.fulfillmentType === 'pickup' || selectedOrder.deliveryFee === 0
                              ? 'WhatsApp: Ready For Pick Up'
                              : 'WhatsApp: Order Dispatched'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Order Fulfillment Status & Admin Note */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                          Update Fulfillment Status
                        </label>
                        <select
                          value={selectedOrder.orderStatus}
                          onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, { orderStatus: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                        >
                          <option value="placed">Order Placed (Waiting Review)</option>
                          <option value="processing">Processing & Decanting</option>
                          <option value="shipped">Handed to Courier</option>
                          <option value="delivered">Delivered to Customer</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                          Internal Admin Verification Note
                        </label>
                        <input
                          type="text"
                          defaultValue={selectedOrder.adminNotes || ''}
                          onBlur={(e) => handleUpdateOrderStatus(selectedOrder.id, { adminNotes: e.target.value })}
                          placeholder="e.g. Bank slip verified on Commercial Bank app"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CUSTOMERS & VIP MEMBERSHIP MANAGEMENT */}
          {activeTab === 'customers' && (() => {
            const filteredCustomers = customersList.filter(c => {
              if (!c) return false;
              if (customerFilterTier === 'premium' && !c.isPremium) return false;
              if (customerSearchQuery) {
                const q = customerSearchQuery.toLowerCase();
                const matchName = c.name && c.name.toLowerCase().includes(q);
                const matchEmail = c.email && c.email.toLowerCase().includes(q);
                const matchPhone = c.phone && c.phone.toLowerCase().includes(q);
                const matchCity = c.city && c.city.toLowerCase().includes(q);
                return matchName || matchEmail || matchPhone || matchCity;
              }
              return true;
            });

            const premiumCount = customersList.filter(c => c.isPremium).length;

            return (
              <div className="space-y-6 animate-in fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#d4af37]" />
                      <span>Customers</span>
                    </h2>
                    <p className="text-xs text-gray-400">
                      View customer details, Gmail addresses, WhatsApp contact info, elevate to VIP Premium status, or reset credentials.
                    </p>
                  </div>
                  <button
                    onClick={loadAdminData}
                    className="px-3.5 py-1.5 rounded-xl bg-[#14141c] border border-white/10 hover:border-[#d4af37] text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Refresh Customers</span>
                  </button>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-[#0d0d12]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase font-semibold">Total Registered Customers</span>
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="font-serif-luxury text-2xl font-bold text-white mt-2">
                      {customersList.length}
                    </div>
                    <span className="text-[10px] text-gray-500">Active customer database</span>
                  </div>

                  <div className="glass-panel p-4 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#12121a] to-[#181824]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#f3e5ab] uppercase font-semibold">VIP Premium Members</span>
                      <Crown className="w-4 h-4 text-[#d4af37]" />
                    </div>
                    <div className="font-serif-luxury text-2xl font-bold gold-text-gradient mt-2">
                      {premiumCount}
                    </div>
                    <span className="text-[10px] text-[#c5a059]">Special loyalty privileges</span>
                  </div>

                  <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-[#0d0d12]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase font-semibold">Verified Orders Total</span>
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="font-serif-luxury text-2xl font-bold text-emerald-400 mt-2">
                      Rs. {customersList.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-gray-500">Combined customer revenue</span>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customer name, Gmail, phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#181822] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setCustomerFilterTier('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                        customerFilterTier === 'all'
                          ? 'bg-[#d4af37] text-black font-bold shadow-md'
                          : 'bg-[#181822] text-gray-300 hover:text-white border border-white/5'
                      }`}
                    >
                      All Customers ({customersList.length})
                    </button>
                    <button
                      onClick={() => setCustomerFilterTier('premium')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        customerFilterTier === 'premium'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow-md'
                          : 'bg-[#181822] text-amber-300 hover:text-white border border-white/5'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>VIP Members ({premiumCount})</span>
                    </button>
                  </div>
                </div>

                {/* Customers Table */}
                <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl bg-[#0d0d12]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121218] border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Customer Name</th>
                          <th className="p-4">Gmail / Email</th>
                          <th className="p-4">Phone / WhatsApp</th>
                          <th className="p-4">Address / City</th>
                          <th className="p-4">Membership Tier</th>
                          <th className="p-4">Orders & Spent</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400">
                              No customer accounts found matching your query.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map(cust => (
                            <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                              {/* Name & Avatar */}
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase flex items-center justify-center font-serif-luxury shadow-md flex-shrink-0">
                                    {cust.name ? cust.name.trim().charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-white block text-sm">{cust.name}</span>
                                      {cust.role === 'admin' && (
                                        <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#d4af37] text-black uppercase">
                                          Admin
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">ID: {cust.id}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Gmail / Email */}
                              <td className="p-4">
                                <div className="flex items-center gap-1.5 text-gray-300">
                                  <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <a
                                    href={`mailto:${cust.email}`}
                                    className="font-mono text-xs hover:text-[#d4af37] hover:underline"
                                  >
                                    {cust.email}
                                  </a>
                                </div>
                              </td>

                              {/* WhatsApp / Phone */}
                              <td className="p-4">
                                {cust.phone ? (
                                  <a
                                    href={`https://wa.me/${String(cust.phone).replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-mono bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-lg"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{cust.phone}</span>
                                  </a>
                                ) : (
                                  <span className="text-gray-500 text-[10px]">No phone added</span>
                                )}
                              </td>

                              {/* Address */}
                              <td className="p-4">
                                <span className="text-gray-300 block truncate max-w-[150px]">
                                  {cust.address || 'Address pending'}
                                </span>
                                <span className="text-[10px] text-[#c5a059] block">
                                  {cust.city || 'Sri Lanka'}
                                </span>
                              </td>

                              {/* Membership Status & Toggle */}
                              <td className="p-4">
                                {cust.isPremium ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md uppercase tracking-wider">
                                      <Crown className="w-3 h-3 fill-black text-black" />
                                      <span>VIP Member</span>
                                    </span>
                                    <button
                                      onClick={() => handleToggleCustomerPremium(cust.id)}
                                      className="block text-[9px] text-gray-400 hover:text-white underline cursor-pointer"
                                      title="Revoke VIP Status"
                                    >
                                      Remove VIP
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-gray-300">
                                      Standard
                                    </span>
                                    <button
                                      onClick={() => handleToggleCustomerPremium(cust.id)}
                                      className="block text-[9px] text-[#d4af37] hover:underline font-semibold cursor-pointer"
                                      title="Elevate to VIP Premium Member"
                                    >
                                      ✨ Make VIP
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Orders & Spent */}
                              <td className="p-4">
                                <span className="text-white font-medium block">
                                  {cust.totalOrders} {cust.totalOrders === 1 ? 'Order' : 'Orders'}
                                </span>
                                <span className="font-serif-luxury text-[11px] font-bold text-[#fcf6ba]">
                                  Rs. {Number(cust.totalSpent || 0).toLocaleString()}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedCustomerForPassword(cust);
                                      setNewPasswordInput('');
                                      setPasswordResetFeedback({ success: '', error: '' });
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#181822] hover:bg-[#d4af37]/20 border border-white/10 hover:border-[#d4af37] text-gray-300 hover:text-[#fcf6ba] text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                    title="Reset Customer Password"
                                  >
                                    <Key className="w-3.5 h-3.5 text-[#d4af37]" />
                                    <span>Reset Password</span>
                                  </button>

                                  {cust.role !== 'admin' && (
                                    <button
                                      onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                                      className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer"
                                      title="Delete Customer Account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RESET PASSWORD MODAL */}
                {selectedCustomerForPassword && (
                  <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-md glass-panel bg-[#0d0d12] rounded-3xl border border-[#d4af37]/40 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
                      <div className="flex items-start justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#aa820a] text-black font-bold flex items-center justify-center">
                            <Key className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-serif-luxury text-base font-bold text-white">
                              Reset Customer Password
                            </h3>
                            <p className="text-xs text-gray-400">
                              {selectedCustomerForPassword.name}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCustomerForPassword(null)}
                          className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customer Gmail:</span>
                          <span className="text-white font-mono">{selectedCustomerForPassword.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">WhatsApp / Phone:</span>
                          <span className="text-white font-mono">{selectedCustomerForPassword.phone || 'N/A'}</span>
                        </div>
                      </div>

                      {passwordResetFeedback.error && (
                        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs">
                          {passwordResetFeedback.error}
                        </div>
                      )}

                      {passwordResetFeedback.success && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{passwordResetFeedback.success}</span>
                        </div>
                      )}

                      <form onSubmit={handleResetCustomerPassword} className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] uppercase tracking-wider text-gray-300 font-semibold">
                              New Password *
                            </label>
                            <button
                              type="button"
                              onClick={() => setNewPasswordInput(`Scentory@${Math.floor(1000 + Math.random() * 9000)}`)}
                              className="text-[10px] text-[#fcf6ba] hover:underline cursor-pointer"
                            >
                              Auto-Generate Temp Pass
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              placeholder="Minimum 6 characters (e.g. Scentory@2026)"
                              value={newPasswordInput}
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 focus:border-[#d4af37] text-white text-xs outline-none font-mono"
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            The customer can log in immediately with this new password.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForPassword(null)}
                            className="w-1/3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={resettingPassword}
                            className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            {resettingPassword ? 'Updating Password...' : 'Save & Set Password'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: CUSTOMER REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider">
                    Customer Reviews & Moderation
                  </h2>
                  <p className="text-xs text-gray-400">
                    Only authorized admins can remove or delete verified reviews.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#14141c] border border-[#d4af37]/30 text-xs font-bold text-[#fcf6ba]">
                  Total Reviews: {reviewsList.length}
                </span>
              </div>

              {reviewsList.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center border border-[#d4af37]/20">
                  <Star className="w-12 h-12 text-[#d4af37]/40 mx-auto mb-3" />
                  <h3 className="font-serif-luxury text-lg text-white mb-1">No Reviews Submitted</h3>
                  <p className="text-xs text-gray-400">Customer ratings and photo reviews will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviewsList.map(rev => (
                    <div
                      key={rev.id}
                      className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-[#d4af37]/40 flex flex-col justify-between space-y-3 bg-[#0d0d12]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < (rev.rating || 5)
                                    ? 'text-[#d4af37] fill-[#d4af37]'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => handleDeleteAdminReview(rev.id)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer"
                            title="Admin: Delete Review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-[10px] text-[#fcf6ba] font-mono block mb-1">{rev.productName}</span>
                        <p className="text-xs text-gray-200 line-clamp-3">"{rev.comment}"</p>

                        {rev.image && (
                          <div className="mt-2 w-20 h-16 rounded-lg overflow-hidden border border-white/10">
                            <img src={rev.image} alt="Review" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-semibold text-white">{rev.customerName}</span>
                        <span>{rev.location || 'Sri Lanka'} • {new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRODUCTS & ML VARIANTS MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider">
                    Fragrances & ML Sizes
                  </h2>
                  <p className="text-xs text-gray-400">
                    Add new perfumes, set bottle sizes (5ml, 10ml, 50ml), prices, discounts, and toggle featured on Home.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm(initialProductForm);
                    setIsProductModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:opacity-90 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Fragrance</span>
                </button>
              </div>

              {/* Products Grid */}
              {products.length === 0 ? (
                <div className="glass-panel p-12 sm:p-16 rounded-3xl border border-[#d4af37]/30 text-center space-y-4 max-w-xl mx-auto my-8 shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center mx-auto text-[#d4af37]">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif-luxury text-xl font-bold text-white">Your Fragrance Catalog is Fresh & Ready</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    All demo fragrances have been cleared. Click below to add your first authentic fragrance masterpiece with custom decants, pricing, and olfactory notes.
                  </p>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        tagline: 'Extrait De Parfum',
                        description: '',
                        gender: 'Unisex',
                        scentFamily: 'Oriental Woody',
                        isFeatured: true,
                        isSpecialOffer: false,
                        badge: 'Signature Edition',
                        images: ['/brand-logo.png'],
                        variants: [
                          { id: 'v_10ml', size: '10ml Travel Atomizer', price: 3800, discountPrice: 3400, stock: 40, sku: 'DEC-10ML' },
                          { id: 'v_20ml', size: '20ml Decant Flacon', price: 7200, discountPrice: 6500, stock: 25, sku: 'DEC-20ML' },
                          { id: 'v_50ml', size: '50ml Signature Bottle', price: 16500, discountPrice: 14900, stock: 15, sku: 'DEC-50ML' },
                          { id: 'v_100ml', size: '100ml Pure Extrait', price: 28500, discountPrice: 25900, stock: 10, sku: 'FLA-100ML' }
                        ],
                        notes: {
                          top: ['Bergamot', 'Neroli'],
                          heart: ['Amber Resin', 'Royal Oud'],
                          base: ['Vanilla', 'Sandalwood']
                        },
                        _notesDraft: {
                          top: 'Bergamot, Neroli',
                          heart: 'Amber Resin, Royal Oud',
                          base: 'Vanilla, Sandalwood'
                        }
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa771c] text-black font-bold text-xs uppercase tracking-widest shadow-lg hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Your First Fragrance
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => {
                  const lowestPrice = Math.min(...(product.variants || []).map(v => v.discountPrice || v.price));
                  return (
                    <div key={product.id} className="glass-panel rounded-2xl border border-[#d4af37]/20 p-5 space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 mb-3 border border-white/10">
                          <img src={product.images?.[0]} alt="" className="w-full h-full object-cover" />
                          {product.isFeatured && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-[#d4af37] text-black uppercase">
                              Featured on Home
                            </span>
                          )}
                          {product.badge && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold bg-black/80 border border-[#d4af37]/50 text-[#f3e5ab]">
                              {product.badge}
                            </span>
                          )}
                          {product.isSpecialOffer && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-rose-600/95 text-white uppercase tracking-wider shadow flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Offer Active</span>
                            </span>
                          )}
                          {settings?.promotionalDeal?.enabled && (
                            settings?.promotionalDeal?.appliesTo === 'all' ||
                            (settings?.promotionalDeal?.applicableProductIds || []).map(String).includes(String(product.id))
                          ) && (
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-700/95 text-white uppercase tracking-wider shadow flex items-center gap-1">
                              <Gift className="w-2.5 h-2.5" />
                              <span>{settings?.promotionalDeal?.badgeText || 'Deal Active'}</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-[#d4af37] uppercase tracking-wider">{product.scentFamily} • {product.gender}</span>
                        <h3 className="font-serif-luxury text-base font-bold text-white">{product.name}</h3>
                        <p className="text-xs text-gray-400 line-clamp-1">{product.tagline}</p>

                        {/* Variants Preview */}
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Variants ({product.variants?.length || 0}):</span>
                          <div className="flex flex-wrap gap-1">
                            {(product.variants || []).map((v, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/10 text-gray-300">
                                {v.size}: <strong>Rs. {(v.discountPrice || v.price).toLocaleString()}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase">Base Price</span>
                          <span className="font-serif-luxury font-bold text-[#f3e5ab] text-sm">Rs. {lowestPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setProductForm({
                                ...product,
                                isSpecialOffer: Boolean(product.isSpecialOffer),
                                notes: {
                                  top: product.notes?.top || [],
                                  heart: product.notes?.heart || [],
                                  base: product.notes?.base || []
                                },
                                _notesDraft: {
                                  top: (product.notes?.top || []).join(', '),
                                  heart: (product.notes?.heart || []).join(', '),
                                  base: (product.notes?.base || []).join(', ')
                                }
                              });
                              setIsProductModalOpen(true);
                            }}
                            className="p-2 rounded-lg bg-[#181822] hover:bg-[#d4af37] hover:text-black text-gray-300 text-xs transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* PRODUCT ADD / EDIT MODAL */}
              {isProductModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="relative w-full max-w-4xl glass-panel bg-[#0d0d12] rounded-3xl border border-[#d4af37]/40 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
                    <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/20">
                      <div>
                        <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">Fragrance Catalogue Editor</span>
                        <h3 className="font-serif-luxury text-xl font-bold text-white">
                          {editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Fragrance Masterpiece'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setIsProductModalOpen(false)}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                            Fragrance Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            placeholder="e.g. Royal Amber Noir"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                            Tagline / Subtitle
                          </label>
                          <input
                            type="text"
                            value={productForm.tagline}
                            onChange={(e) => setProductForm({ ...productForm, tagline: e.target.value })}
                            placeholder="e.g. Extrait De Parfum • Rare Oud & Amber"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                            Target Gender
                          </label>
                          <select
                            value={productForm.gender}
                            onChange={(e) => setProductForm({ ...productForm, gender: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                          >
                            <option value="unisex">Unisex</option>
                            <option value="men">For Men</option>
                            <option value="women">For Women</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                            Scent Family
                          </label>
                          <select
                            value={productForm.scentFamily}
                            onChange={(e) => setProductForm({ ...productForm, scentFamily: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                          >
                            <option value="Oriental Woody">Oriental Woody</option>
                            <option value="Woody Powdery">Woody Powdery</option>
                            <option value="Floral Amber">Floral Amber</option>
                            <option value="Fresh Aromatic">Fresh Aromatic</option>
                            <option value="Gourmand Tobacco">Gourmand Tobacco</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                            Olfactory Description
                          </label>
                          <textarea
                            rows={3}
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                            placeholder="Detailed notes and fragrance experience..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                          />
                        </div>

                        {/* OLFACTORY PYRAMID STRUCTURE (TOP, HEART & BASE NOTES) */}
                        <div className="sm:col-span-2 p-4 rounded-2xl bg-[#121218] border border-[#d4af37]/35 space-y-3.5 shadow-md">
                          <div className="flex items-center justify-between pb-2 border-b border-[#d4af37]/15">
                            <label className="text-xs font-serif-luxury font-bold uppercase tracking-wider text-[#f3e5ab] flex items-center gap-2">
                              <span>Olfactory Pyramid Structure</span>
                            </label>
                            <span className="text-[10px] text-gray-400">
                              Separate notes with commas (e.g. Bergamot, Neroli, Lemon)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            {/* Top Notes */}
                            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                              <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] font-semibold">
                                Top Notes (Head)
                              </label>
                              <input
                                type="text"
                                value={productForm._notesDraft?.top !== undefined ? productForm._notesDraft.top : (productForm.notes?.top || []).join(', ')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const arr = val.split(',').map(s => s.trim()).filter(Boolean);
                                  setProductForm(prev => ({
                                    ...prev,
                                    notes: { ...(prev.notes || {}), top: arr },
                                    _notesDraft: { ...(prev._notesDraft || {}), top: val }
                                  }));
                                }}
                                placeholder="e.g. Bergamot, Neroli, Lemon"
                                className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                              />
                              <div className="flex flex-wrap gap-1 min-h-[24px]">
                                {(productForm.notes?.top || []).map((n, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-[#1e1e28] text-[#fcf6ba] text-[10px] border border-[#d4af37]/30">
                                    {n}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Heart Notes */}
                            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                              <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] font-semibold">
                                Heart Notes (Middle)
                              </label>
                              <input
                                type="text"
                                value={productForm._notesDraft?.heart !== undefined ? productForm._notesDraft.heart : (productForm.notes?.heart || []).join(', ')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const arr = val.split(',').map(s => s.trim()).filter(Boolean);
                                  setProductForm(prev => ({
                                    ...prev,
                                    notes: { ...(prev.notes || {}), heart: arr },
                                    _notesDraft: { ...(prev._notesDraft || {}), heart: val }
                                  }));
                                }}
                                placeholder="e.g. Amber Resin, Royal Oud"
                                className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                              />
                              <div className="flex flex-wrap gap-1 min-h-[24px]">
                                {(productForm.notes?.heart || []).map((n, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-[#1e1e28] text-[#fcf6ba] text-[10px] border border-[#d4af37]/30">
                                    {n}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Base Notes */}
                            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                              <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] font-semibold">
                                Base Notes (Drydown)
                              </label>
                              <input
                                type="text"
                                value={productForm._notesDraft?.base !== undefined ? productForm._notesDraft.base : (productForm.notes?.base || []).join(', ')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const arr = val.split(',').map(s => s.trim()).filter(Boolean);
                                  setProductForm(prev => ({
                                    ...prev,
                                    notes: { ...(prev.notes || {}), base: arr },
                                    _notesDraft: { ...(prev._notesDraft || {}), base: val }
                                  }));
                                }}
                                placeholder="e.g. Vanilla, Sandalwood, Musk"
                                className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                              />
                              <div className="flex flex-wrap gap-1 min-h-[24px]">
                                {(productForm.notes?.base || []).map((n, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-[#1e1e28] text-[#fcf6ba] text-[10px] border border-[#d4af37]/30">
                                    {n}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                            Badge Label (e.g. Best Seller)
                          </label>
                          <input
                            type="text"
                            value={productForm.badge}
                            onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-5">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                            <input
                              type="checkbox"
                              checked={productForm.isFeatured}
                              onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                              className="w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37]"
                            />
                            <span>Feature on Home Page</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-300 bg-rose-950/40 px-3.5 py-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 transition-colors">
                            <input
                              type="checkbox"
                              checked={Boolean(productForm.isSpecialOffer)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setProductForm(prev => ({
                                  ...prev,
                                  isSpecialOffer: checked,
                                  variants: !checked
                                    ? prev.variants.map(v => ({ ...v, discountPrice: null }))
                                    : prev.variants
                                }));
                              }}
                              className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 accent-rose-500 cursor-pointer"
                            />
                            <span className="font-semibold">Display in Special Offers Section</span>
                          </label>

                          {settings?.promotionalDeal?.enabled && settings?.promotionalDeal?.appliesTo === 'specific' && editingProduct && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-300 bg-emerald-950/40 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 transition-colors">
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  (settings?.promotionalDeal?.applicableProductIds || []).map(String).includes(String(editingProduct.id))
                                )}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const curIds = (settings?.promotionalDeal?.applicableProductIds || []).map(String);
                                  const nextIds = checked
                                    ? [...new Set([...curIds, String(editingProduct.id)])]
                                    : curIds.filter(id => id !== String(editingProduct.id));
                                  setSettings(prev => ({
                                    ...prev,
                                    promotionalDeal: {
                                      ...(prev?.promotionalDeal || {}),
                                      applicableProductIds: nextIds
                                    }
                                  }));
                                }}
                                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                              />
                              <span className="font-semibold flex items-center gap-1">
                                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Include in {settings?.promotionalDeal?.title || 'Promotional Deal'}</span>
                              </span>
                            </label>
                          )}
                        </div>
                      </div>

                      {/* IMAGES: UPLOAD OR PASTE URL */}
                      <div className="p-4 rounded-2xl bg-[#14141c] border border-[#d4af37]/25 space-y-3">
                        <label className="block text-xs uppercase tracking-wider text-[#f3e5ab] font-bold">
                          Fragrance Images (Upload File or Paste Image URL)
                        </label>

                        {/* Paste URL row */}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            placeholder="Paste external image URL (https://...)"
                            className="flex-1 px-4 py-2 rounded-xl bg-[#1b1b26] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                          />
                          <button
                            type="button"
                            onClick={handleAddImageUrl}
                            className="px-4 py-2 rounded-xl bg-[#1f1f2e] hover:bg-[#d4af37] hover:text-black text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
                          >
                            Add URL
                          </button>
                        </div>

                        {/* Upload local image file */}
                        <div className="flex items-center gap-3">
                          <label className="px-4 py-2 rounded-xl border border-dashed border-[#d4af37]/50 hover:border-[#d4af37] text-xs font-medium text-[#f3e5ab] cursor-pointer bg-black/30 flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span>{uploadingImage ? 'Uploading Image...' : 'Upload Image File from Computer'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Image Thumbnails list */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          {(productForm.images || []).map((img, idx) => (
                            <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#d4af37]/30 group">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* DYNAMIC BOTTLE SIZE VARIANTS (5ml, 10ml, 20ml, 50ml, etc.) */}
                      <div className="p-4 rounded-2xl bg-[#14141c] border border-[#d4af37]/25 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-[#f3e5ab] font-bold">
                              Bottle Size Variants & Pricing
                            </h4>
                            <p className="text-[11px] text-gray-400">
                              Define sizes (5ml, 10ml, 20ml, 50ml, 100ml) with specific LKR prices, discount prices, and stock.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1 hover:opacity-90 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Variant</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {productForm.variants.map((v, idx) => (
                            <div key={v.id || idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-3 rounded-xl bg-black/40 border border-white/5">
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block">Size Label</span>
                                <input
                                  type="text"
                                  value={v.size}
                                  onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
                                  placeholder="e.g. 10ml Spray"
                                  className="w-full px-2.5 py-1.5 rounded bg-[#181824] border border-white/10 text-white text-xs outline-none"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block">Price (LKR) *</span>
                                <input
                                  type="number"
                                  required
                                  value={v.price}
                                  onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                                  placeholder="Rs."
                                  className="w-full px-2.5 py-1.5 rounded bg-[#181824] border border-white/10 text-white text-xs outline-none"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[9px] text-gray-400 uppercase block">Discount Price (LKR)</span>
                                  {!productForm.isSpecialOffer && (
                                    <span className="text-[8px] text-amber-400/90 font-mono font-semibold flex items-center gap-0.5" title="Field is locked. Tick 'Display in Special Offers Section' above to unlock.">
                                      🔒 Locked
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  disabled={!productForm.isSpecialOffer}
                                  value={productForm.isSpecialOffer ? (v.discountPrice ?? '') : ''}
                                  onChange={(e) => handleUpdateVariant(idx, 'discountPrice', e.target.value)}
                                  placeholder={productForm.isSpecialOffer ? "Optional sale price" : "Locked (Enable offer)"}
                                  title={!productForm.isSpecialOffer ? "Tick 'Display in Special Offers Section' above to unlock this field" : "Discount price in LKR"}
                                  className={`w-full px-2.5 py-1.5 rounded border text-xs outline-none transition-all ${
                                    productForm.isSpecialOffer
                                      ? 'bg-[#181824] border-rose-500/30 text-rose-300 focus:border-rose-400'
                                      : 'bg-black/50 border-white/5 text-gray-500 cursor-not-allowed opacity-50'
                                  }`}
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block">Stock Qty</span>
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => handleUpdateVariant(idx, 'stock', e.target.value)}
                                  placeholder="Qty"
                                  className="w-full px-2.5 py-1.5 rounded bg-[#181824] border border-white/10 text-white text-xs outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-2 pt-3 sm:pt-0">
                                <input
                                  type="text"
                                  value={v.sku || ''}
                                  onChange={(e) => handleUpdateVariant(idx, 'sku', e.target.value)}
                                  placeholder="SKU"
                                  className="w-full px-2.5 py-1.5 rounded bg-[#181824] border border-white/10 text-gray-300 text-xs outline-none font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(idx)}
                                  className="p-1.5 text-gray-400 hover:text-red-400 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setIsProductModalOpen(false)}
                          className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 cursor-pointer"
                        >
                          Save Fragrance Masterpiece
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REAL-TIME INVENTORY & VARIANT STOCK MANAGEMENT */}
          {activeTab === 'stock' && (() => {
            const filteredStockProducts = products.filter(p => {
              if (!stockSearchQuery) return true;
              const q = stockSearchQuery.toLowerCase();
              const matchName = p.name?.toLowerCase().includes(q);
              const matchFamily = p.scentFamily?.toLowerCase().includes(q);
              const matchVariant = (p.variants || []).some(v =>
                v.size?.toLowerCase().includes(q) || v.sku?.toLowerCase().includes(q)
              );
              return matchName || matchFamily || matchVariant;
            });

            const activeStockProduct = products.find(p => p.id === selectedStockProductId) || filteredStockProducts[0] || products[0];

            return (
              <div className="space-y-6 animate-in fade-in">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider">
                      Real-Time Inventory & Variant Stock
                    </h2>
                    <p className="text-xs text-gray-400">
                      Search and select any perfume to update individual bottle size variants (5ml, 10ml, 20ml, 50ml, 100ml).
                    </p>
                  </div>

                  {/* Mode Toggles */}
                  <div className="flex items-center gap-2 bg-[#12121a] p-1 rounded-xl border border-white/10 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setStockViewMode('select')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        stockViewMode === 'select'
                          ? 'bg-[#d4af37] text-black shadow-md font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Select & Update Variant
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockViewMode('grid')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        stockViewMode === 'grid'
                          ? 'bg-[#d4af37] text-black shadow-md font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All Fragrances Grid
                    </button>
                  </div>
                </div>

                {/* Instant Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    placeholder="Search fragrance by name, scent notes, or SKU..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] transition-all"
                  />
                  {stockSearchQuery && (
                    <button
                      onClick={() => setStockSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* MODE 1: SELECT FRAGRANCE & UPDATE EACH VARIANT INDIVIDUALLY */}
                {stockViewMode === 'select' && (
                  <div className="space-y-6">
                    {/* Fragrance Picker Carousel / List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-[#f3e5ab] font-bold">
                          Step 1: Select Fragrance Masterpiece ({filteredStockProducts.length})
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Click to inspect and update variant stock
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredStockProducts.map(prod => {
                          const isSelected = activeStockProduct?.id === prod.id;
                          const totalStock = (prod.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => setSelectedStockProductId(prod.id)}
                              className={`p-3 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                                isSelected
                                  ? 'bg-[#1c1c28] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)] ring-1 ring-[#d4af37]'
                                  : 'bg-[#101017] border-white/10 hover:border-white/30 hover:bg-[#14141f]'
                              }`}
                            >
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-black/50">
                                <img
                                  src={prod.images?.[0]}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-1.5 right-1.5 bg-[#d4af37] text-black text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shadow">
                                    Selected
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="font-serif-luxury text-xs font-bold text-white line-clamp-1">{prod.name}</h4>
                                <p className="text-[10px] text-gray-400 line-clamp-1">{prod.scentFamily}</p>
                                <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                                  totalStock <= 20 ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                                }`}>
                                  {totalStock} units
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Dedicated Variant Stock Cards for Selected Fragrance */}
                    {activeStockProduct && (
                      <div className="glass-panel p-6 rounded-3xl border border-[#d4af37]/35 shadow-2xl bg-[#0b0b12] space-y-6 animate-in zoom-in-95">
                        {/* Selected Fragrance Summary Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                          <div className="flex items-center gap-4">
                            <img
                              src={activeStockProduct.images?.[0]}
                              alt=""
                              className="w-16 h-16 object-cover rounded-2xl border border-[#d4af37]/40 shadow-lg"
                            />
                            <div>
                              <span className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold">
                                Step 2: Update Variants For
                              </span>
                              <h3 className="font-serif-luxury text-xl font-bold text-white">
                                {activeStockProduct.name}
                              </h3>
                              <p className="text-xs text-gray-400">
                                {activeStockProduct.scentFamily} • {activeStockProduct.tagline}
                              </p>
                            </div>
                          </div>

                          <div className="px-4 py-2 rounded-xl bg-black/60 border border-white/10 text-right">
                            <span className="text-[10px] uppercase text-gray-400 block">Total Bottle Stock</span>
                            <span className="text-base font-bold font-mono gold-text-gradient">
                              {(activeStockProduct.variants || []).reduce((acc, v) => acc + (v.stock || 0), 0)} Units Available
                            </span>
                          </div>
                        </div>

                        {/* Variants List / Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(activeStockProduct.variants || []).map((v) => {
                            const isLow = v.stock <= 10;
                            const isOut = v.stock === 0;
                            const isUpdated = stockUpdateFeedback[v.id];
                            const draftVal = stockDrafts[v.id] !== undefined ? stockDrafts[v.id] : v.stock;

                            return (
                              <div
                                key={v.id}
                                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 bg-[#12121c] ${
                                  isUpdated
                                    ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500'
                                    : 'border-white/10 hover:border-[#d4af37]/40'
                                }`}
                              >
                                {/* Variant Info Header */}
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                      {v.size}
                                    </span>
                                    <span className="text-xs text-[#f3e5ab] font-mono font-medium">
                                      Rs. {v.price?.toLocaleString()}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/10 text-gray-400">
                                    SKU: {v.sku}
                                  </span>
                                </div>

                                {/* Current Stock Status Pill */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-black/50 border border-white/5">
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 block">
                                      Current Stock
                                    </span>
                                    <span className="font-mono text-base font-bold text-white">
                                      {v.stock} units
                                    </span>
                                  </div>
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      isOut
                                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                        : isLow
                                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    }`}
                                  >
                                    {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                                  </span>
                                </div>

                                {/* Quantity Adjuster with Stepper Buttons */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block">
                                    Adjust Quantity:
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStockDrafts({
                                          ...stockDrafts,
                                          [v.id]: Math.max(0, draftVal - 10)
                                        });
                                      }}
                                      className="px-2 py-1.5 rounded-lg bg-[#1a1a26] hover:bg-white/10 text-gray-300 text-xs font-mono font-semibold"
                                      title="Decrease 10"
                                    >
                                      -10
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStockDrafts({
                                          ...stockDrafts,
                                          [v.id]: Math.max(0, draftVal - 1)
                                        });
                                      }}
                                      className="px-2 py-1.5 rounded-lg bg-[#1a1a26] hover:bg-white/10 text-gray-300 text-xs font-mono font-semibold"
                                      title="Decrease 1"
                                    >
                                      -1
                                    </button>

                                    <input
                                      type="number"
                                      min="0"
                                      value={draftVal}
                                      onChange={(e) => {
                                        setStockDrafts({
                                          ...stockDrafts,
                                          [v.id]: Math.max(0, parseInt(e.target.value, 10) || 0)
                                        });
                                      }}
                                      className="flex-1 py-1 px-2 rounded-lg bg-black border border-white/20 text-center text-white font-mono font-bold text-sm focus:border-[#d4af37] outline-none"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStockDrafts({
                                          ...stockDrafts,
                                          [v.id]: draftVal + 1
                                        });
                                      }}
                                      className="px-2 py-1.5 rounded-lg bg-[#1a1a26] hover:bg-white/10 text-gray-300 text-xs font-mono font-semibold"
                                      title="Increase 1"
                                    >
                                      +1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStockDrafts({
                                          ...stockDrafts,
                                          [v.id]: draftVal + 10
                                        });
                                      }}
                                      className="px-2 py-1.5 rounded-lg bg-[#1a1a26] hover:bg-white/10 text-gray-300 text-xs font-mono font-semibold"
                                      title="Increase 10"
                                    >
                                      +10
                                    </button>
                                  </div>
                                </div>

                                {/* Individual Update Button */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateVariantStock(activeStockProduct.id, v.id, draftVal)}
                                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                                    isUpdated
                                      ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                      : 'bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black hover:opacity-90'
                                  }`}
                                >
                                  {isUpdated ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Stock Updated ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Update {v.size} Stock</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 2: ALL FRAGRANCES INVENTORY GRID (FILTERABLE BY SEARCH) */}
                {stockViewMode === 'grid' && (
                  <div className="glass-panel rounded-2xl border border-[#d4af37]/25 overflow-hidden shadow-xl">
                    <div className="divide-y divide-white/5">
                      {filteredStockProducts.map(prod => (
                        <div key={prod.id} className="p-4 sm:p-5 hover:bg-white/5 transition-colors">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <img src={prod.images?.[0]} alt="" className="w-10 h-10 object-cover rounded-lg border border-white/10" />
                              <div>
                                <h4 className="font-serif-luxury text-sm font-bold text-white">{prod.name}</h4>
                                <span className="text-[10px] text-gray-400">{prod.scentFamily}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStockProductId(prod.id);
                                setStockViewMode('select');
                              }}
                              className="text-xs text-[#d4af37] hover:underline"
                            >
                              Focus & Update Variants &rarr;
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {(prod.variants || []).map(v => (
                              <div key={v.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-medium text-gray-200 block">{v.size}</span>
                                  <span className="text-[10px] text-gray-400">SKU: {v.sku}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    defaultValue={v.stock}
                                    onBlur={(e) => handleQuickStockSave(prod.id, v.id, e.target.value)}
                                    className={`w-16 px-2 py-1 rounded text-center text-xs font-bold font-mono outline-none border ${
                                      v.stock <= 5
                                        ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                                        : v.stock <= 10
                                        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                                        : 'bg-[#181824] text-white border-white/10 focus:border-[#d4af37]'
                                    }`}
                                  />
                                  <span className="text-[10px] text-gray-400">units</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 5: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && reports && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider">
                    Sales Reports & Performance
                  </h2>
                  <p className="text-xs text-gray-400">
                    Comprehensive breakdown of sales and fragrance revenue across Sri Lanka.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider shadow-md hover:opacity-90 cursor-pointer"
                >
                  Download Complete CSV
                </button>
              </div>

              {/* Product Revenue Breakdown */}
              <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/25 space-y-4">
                <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider">
                  Product Sales Breakdown (Verified Payments)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="pb-3">Fragrance Title</th>
                        <th className="pb-3">Total Bottles Ordered</th>
                        <th className="pb-3 text-right">Total Revenue (LKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {reports.productBreakdown.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-3 font-semibold text-white">{item.productName}</td>
                          <td className="py-3 text-gray-300">{item.totalUnits} Units</td>
                          <td className="py-3 text-right font-serif-luxury font-bold text-[#f3e5ab]">
                            Rs. {item.totalRevenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROMOTIONS & DEALS (BUY X GET Y FREE) */}
          {activeTab === 'deals' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#d4af37]" />
                    <span>Promotions & Deals Engine</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Configure multi-bottle promotions like "Buy 2 Get 1 Free" or "Buy 2 Get 3 Free". The store automatically detects qualifying counts and discounts the lowest-priced perfumes to Rs. 0 at checkout.
                  </p>
                </div>
                
                {/* Active Status Badge */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    settings?.promotionalDeal?.enabled
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50'
                      : 'bg-gray-800 text-gray-400 border border-white/10'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${settings?.promotionalDeal?.enabled ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
                    <span>{settings?.promotionalDeal?.enabled ? 'Promotion Active' : 'Promotion Disabled'}</span>
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#d4af37]/25 space-y-8">
                {/* 1. MASTER ON/OFF TOGGLE */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#d4af37]" />
                      <span>Enable Promotional Deal</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      When turned on, the promotion banner appears on the website and eligible cart items automatically get discounted.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.promotionalDeal?.enabled)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSettings(prev => ({
                          ...prev,
                          promotionalDeal: {
                            ...(prev?.promotionalDeal || {}),
                            enabled: checked
                          }
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* 2. DEAL APPLICABILITY SCOPE & PRODUCT PICKER */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#d4af37]" />
                        <span>Eligible Products & Fragrances</span>
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Choose whether this promotional deal applies storewide to all perfumes or only to specific selected products.
                      </p>
                    </div>

                    {/* Scope toggle buttons */}
                    <div className="flex rounded-xl bg-[#14141c] p-1 border border-white/10 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            promotionalDeal: {
                              ...(prev?.promotionalDeal || {}),
                              appliesTo: 'all'
                            }
                          }));
                        }}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          (settings?.promotionalDeal?.appliesTo || 'all') === 'all'
                            ? 'bg-[#d4af37] text-black shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        All Fragrances (Storewide)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            promotionalDeal: {
                              ...(prev?.promotionalDeal || {}),
                              appliesTo: 'specific'
                            }
                          }));
                        }}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          settings?.promotionalDeal?.appliesTo === 'specific'
                            ? 'bg-[#d4af37] text-black shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Specific Fragrances Only
                      </button>
                    </div>
                  </div>

                  {/* If Specific Fragrances is selected, show Product Selector */}
                  {settings?.promotionalDeal?.appliesTo === 'specific' && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-300">
                            Select products for this deal:
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#fcf6ba]">
                            {(settings?.promotionalDeal?.applicableProductIds || []).length} of {products.length} Selected
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = products.map(p => String(p.id));
                              setSettings(prev => ({
                                ...prev,
                                promotionalDeal: {
                                  ...(prev?.promotionalDeal || {}),
                                  applicableProductIds: allIds
                                }
                              }));
                            }}
                            className="text-[11px] font-semibold text-[#d4af37] hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-gray-600">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSettings(prev => ({
                                ...prev,
                                promotionalDeal: {
                                  ...(prev?.promotionalDeal || {}),
                                  applicableProductIds: []
                                }
                              }));
                            }}
                            className="text-[11px] font-semibold text-gray-400 hover:text-white cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          value={dealProductSearch}
                          onChange={(e) => setDealProductSearch(e.target.value)}
                          placeholder="Search fragrances by title or scent family..."
                          className="w-full bg-[#181822] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>

                      {/* Scrollable list of products */}
                      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5 bg-[#121218] p-2 rounded-xl border border-white/5">
                        {products
                          .filter(p => {
                            if (!dealProductSearch.trim()) return true;
                            const q = dealProductSearch.toLowerCase();
                            return (p.name || '').toLowerCase().includes(q) || (p.scentFamily || '').toLowerCase().includes(q);
                          })
                          .map(p => {
                            const isSelected = (settings?.promotionalDeal?.applicableProductIds || []).map(String).includes(String(p.id));
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#d4af37]/15 border-[#d4af37]/60 text-white'
                                    : 'bg-black/30 border-transparent hover:border-white/10 text-gray-400'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const cur = (settings?.promotionalDeal?.applicableProductIds || []).map(String);
                                      const next = checked
                                        ? [...new Set([...cur, String(p.id)])]
                                        : cur.filter(id => id !== String(p.id));
                                      setSettings(prev => ({
                                        ...prev,
                                        promotionalDeal: {
                                          ...(prev?.promotionalDeal || {}),
                                          applicableProductIds: next
                                        }
                                      }));
                                    }}
                                    className="w-4 h-4 rounded bg-[#181822] border-white/20 text-[#d4af37] focus:ring-0 cursor-pointer"
                                  />
                                  <img
                                    src={Array.isArray(p.images) && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=200&q=80'}
                                    alt=""
                                    className="w-9 h-9 object-cover rounded-lg border border-white/10 flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold text-white block truncate">
                                      {p.name}
                                    </span>
                                    <span className="text-[10px] text-gray-400 block truncate">
                                      {p.scentFamily || 'Fragrance'} • {p.variants?.length || 0} bottle sizes
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {isSelected ? (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                                      ✓ Deal Applied
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-500">
                                      Click to pick
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                      </div>

                      {(settings?.promotionalDeal?.applicableProductIds || []).length === 0 && (
                        <p className="text-[11px] text-rose-400 flex items-center gap-1.5 pt-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>No products selected. Please select at least one fragrance above to apply this promotion to.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. ONE-CLICK PRESET BUTTONS */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#fcf6ba] uppercase tracking-wider">
                    Quick Preset Configurations (1-Click Setup)
                  </label>
                  <p className="text-xs text-gray-400">
                    Click any popular promotion formula below to automatically populate the rules and announcements:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Buy 1 Get 1 Free',
                        buy: 1,
                        free: 1,
                        badge: 'BUY 1 GET 1 FREE',
                        desc: 'Classic BOGO. For every 2 perfumes added, 1 is free.'
                      },
                      {
                        label: 'Buy 2 Get 1 Free',
                        buy: 2,
                        free: 1,
                        badge: 'BUY 2 GET 1 FREE',
                        desc: 'Best seller deal. For every 3 perfumes added, 1 is free.'
                      },
                      {
                        label: 'Buy 2 Get 3 Free',
                        buy: 2,
                        free: 3,
                        badge: 'BUY 2 GET 3 FREE',
                        desc: 'Mega deal! For every 5 perfumes added, 3 are free.'
                      },
                      {
                        label: 'Buy 3 Get 1 Free',
                        buy: 3,
                        free: 1,
                        badge: 'BUY 3 GET 1 FREE',
                        desc: 'Bundle deal. For every 4 perfumes added, 1 is free.'
                      }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            promotionalDeal: {
                              ...(prev?.promotionalDeal || {}),
                              title: preset.label,
                              buyQty: preset.buy,
                              freeQty: preset.free,
                              badgeText: preset.badge,
                              bannerText: `Special Promotion: ${preset.label}! Purchase qualifying perfumes and enjoy free fragrances calculated automatically at checkout.`,
                              showBanner: true
                            }
                          }));
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          settings?.promotionalDeal?.buyQty === preset.buy && settings?.promotionalDeal?.freeQty === preset.free
                            ? 'bg-[#d4af37]/20 border-[#d4af37] text-white shadow-lg'
                            : 'bg-black/30 border-white/10 hover:border-white/30 text-gray-300'
                        }`}
                      >
                        <div className="font-bold text-xs uppercase text-[#d4af37] flex items-center justify-between">
                          <span>{preset.label}</span>
                          {settings?.promotionalDeal?.buyQty === preset.buy && settings?.promotionalDeal?.freeQty === preset.free && (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                          {preset.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. RULE SPECIFICATIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Buy Quantity (Number of Bottles Customer Pays For) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={settings?.promotionalDeal?.buyQty || 2}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setSettings(prev => ({
                            ...prev,
                            promotionalDeal: {
                              ...(prev?.promotionalDeal || {}),
                              buyQty: val
                            }
                          }));
                        }}
                        className="w-full bg-[#181822] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#d4af37] focus:outline-none"
                        required
                      />
                      <span className="absolute right-4 top-3.5 text-xs text-gray-500 font-semibold uppercase">Bottles</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      e.g. In "Buy 2 Get 3 Free", enter <strong>2</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Free Quantity (Number of Bottles Given For Free) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={settings?.promotionalDeal?.freeQty || 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setSettings(prev => ({
                            ...prev,
                            promotionalDeal: {
                              ...(prev?.promotionalDeal || {}),
                              freeQty: val
                            }
                          }));
                        }}
                        className="w-full bg-[#181822] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#d4af37] focus:outline-none"
                        required
                      />
                      <span className="absolute right-4 top-3.5 text-xs text-gray-500 font-semibold uppercase">Free Bottles</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      e.g. In "Buy 2 Get 3 Free", enter <strong>3</strong>.
                    </p>
                  </div>
                </div>

                {/* Mathematical Formula Explanation Card */}
                <div className="p-4 rounded-xl bg-[#14141c] border border-[#d4af37]/30 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center flex-shrink-0 text-[#d4af37]">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-[#fcf6ba] uppercase tracking-wider block">
                      Active Mathematical Calculation Logic
                    </span>
                    <p className="text-gray-300 leading-relaxed">
                      Every group of <strong className="text-white">{(Number(settings?.promotionalDeal?.buyQty || 2) + Number(settings?.promotionalDeal?.freeQty || 1))} bottles</strong> in a customer's cart unlocks <strong className="text-emerald-400">{Number(settings?.promotionalDeal?.freeQty || 1)} free bottle(s)</strong>.
                    </p>
                    <p className="text-gray-400 text-[11px]">
                      The system sorts all selected bottle sizes by price and systematically applies 100% discount (Rs. 0) to the {Number(settings?.promotionalDeal?.freeQty || 1)} lowest-priced item(s).
                    </p>
                  </div>
                </div>

                {/* 4. ANNOUNCEMENT & BADGE TEXTS */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Promotion Name / Title
                      </label>
                      <input
                        type="text"
                        value={settings?.promotionalDeal?.title || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            promotionalDeal: {
                              ...(prev?.promotionalDeal || {}),
                              title: val
                            }
                          }));
                        }}
                        placeholder="e.g. Buy 2 Get 3 Free"
                        className="w-full bg-[#181822] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Badge Text (Shows in Cart & Product Badges)
                      </label>
                      <input
                        type="text"
                        value={settings?.promotionalDeal?.badgeText || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            promotionalDeal: {
                              ...(prev?.promotionalDeal || {}),
                              badgeText: val
                            }
                          }));
                        }}
                        placeholder="e.g. BUY 2 GET 3 FREE"
                        className="w-full bg-[#181822] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Home Page Announcement Banner Text
                    </label>
                    <textarea
                      rows={2}
                      value={settings?.promotionalDeal?.bannerText || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          promotionalDeal: {
                            ...(prev?.promotionalDeal || {}),
                            bannerText: val
                          }
                        }));
                      }}
                      placeholder="e.g. Exclusive Offer: Buy 2 perfumes and get 3 free! Discount applies automatically at checkout."
                      className="w-full bg-[#181822] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#d4af37] focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="checkbox"
                      id="showDealBanner"
                      checked={settings?.promotionalDeal?.showBanner !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSettings(prev => ({
                          ...prev,
                          promotionalDeal: {
                            ...(prev?.promotionalDeal || {}),
                            showBanner: checked
                          }
                        }));
                      }}
                      className="w-4 h-4 rounded bg-[#181822] border-white/20 text-[#d4af37] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="showDealBanner" className="text-xs text-gray-300 cursor-pointer">
                      Display announcement banner prominently at the top of the Home Page
                    </label>
                  </div>
                </div>

                {/* 5. PROMOTIONAL FLYER / POSTER IMAGE (FOR HOME PAGE SHOWCASE CARD) */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#d4af37]" />
                      <span>Promotional Deal Poster / Flyer Graphic</span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload a promotional banner image (e.g. Buy 2 Get 1 Free poster flyer) or paste an image URL. This graphic appears directly on the Home Page under the Hero section with a &quot;Shop Fragrances&quot; action button.
                    </p>
                  </div>

                  {/* Paste URL */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={dealImageUrlInput}
                      onChange={(e) => setDealImageUrlInput(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#1b1b26] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={handleAddDealImageUrl}
                      className="px-4 py-2.5 rounded-xl bg-[#1f1f2e] hover:bg-[#d4af37] hover:text-black text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
                    >
                      Set URL
                    </button>
                  </div>

                  {/* Upload file */}
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl border border-dashed border-[#d4af37]/50 hover:border-[#d4af37] text-xs font-medium text-[#f3e5ab] cursor-pointer bg-black/30 flex items-center gap-2 transition-all">
                      <Upload className="w-4 h-4 text-[#d4af37]" />
                      <span>{uploadingDealImage ? 'Uploading Poster...' : 'Upload Poster Image File from Computer'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDealImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Poster preview if set */}
                  {settings?.promotionalDeal?.imageUrl && (
                    <div className="pt-2">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5 font-semibold">
                        Current Uploaded Poster Preview:
                      </span>
                      <div className="relative inline-block rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow-xl bg-black max-w-sm group">
                        <img
                          src={settings.promotionalDeal.imageUrl}
                          alt="Promotional Deal Poster"
                          className="w-full max-h-60 object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveDealImage}
                          className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/85 text-red-400 hover:text-red-300 text-[10px] font-bold border border-red-500/30 flex items-center gap-1 cursor-pointer shadow-lg"
                        >
                          ✕ Remove Poster
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. LIVE CUSTOMER PREVIEW */}
                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    <span>Live Customer Preview (How it appears on website)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Real-time Preview</span>
                  </div>

                  {/* Banner Preview */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#d4af37]/20 via-[#aa820a]/20 to-[#d4af37]/20 border border-[#d4af37]/40 flex items-center gap-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-[#d4af37] text-black flex items-center justify-center font-bold flex-shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#fcf6ba] uppercase tracking-wide">
                          {settings?.promotionalDeal?.title || 'Buy 2 Get 1 Free'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#d4af37] text-black uppercase">
                          {settings?.promotionalDeal?.badgeText || 'SPECIAL OFFER'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/10 text-gray-300">
                          {settings?.promotionalDeal?.appliesTo === 'specific'
                            ? `${(settings?.promotionalDeal?.applicableProductIds || []).length} Selected Perfumes`
                            : 'All Fragrances'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-[11px] mt-0.5 truncate">
                        {settings?.promotionalDeal?.bannerText || 'Add qualifying items to your bag to enjoy complimentary fragrances.'}
                      </p>
                    </div>
                  </div>

                  {/* Home Page Showcase Card Preview */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#0b1410] via-[#0d1214] to-[#121118] border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-4 text-xs">
                    {settings?.promotionalDeal?.imageUrl ? (
                      <img
                        src={settings.promotionalDeal.imageUrl}
                        alt="Deal Poster"
                        className="w-24 h-24 object-contain rounded-lg border border-white/10 bg-black/50 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
                        <Gift className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] text-[#d4af37] uppercase font-bold tracking-wider block">Home Showcase Preview</span>
                      <h5 className="font-serif-luxury text-sm font-bold text-white truncate">
                        {settings?.promotionalDeal?.title || 'Buy 2 Get 1 Free'}
                      </h5>
                      <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5">
                        {settings?.promotionalDeal?.bannerText || 'Special promotion applied automatically at checkout.'}
                      </p>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-[#d4af37] text-black font-bold text-[10px] uppercase tracking-wider flex-shrink-0">
                      Shop Fragrances →
                    </div>
                  </div>
                </div>

                {/* 6. SAVE BUTTON */}
                <div className="flex justify-end pt-4 border-t border-white/10">
                  <button
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa820a] hover:from-[#fcf6ba] hover:to-[#d4af37] text-black font-bold text-xs uppercase tracking-widest shadow-xl cursor-pointer hover:scale-102 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Promotions & Deals</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: STORE & BANK TRANSFER SETTINGS */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="font-serif-luxury text-xl font-bold text-white uppercase tracking-wider">
                  Store & Bank Transfer Settings
                </h2>
                <p className="text-xs text-gray-400">
                  Update Sri Lankan bank account details shown during checkout, delivery charges, and WhatsApp numbers.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#d4af37]/25 space-y-6">
                {/* Bank Details Config (Uneditable / Locked) */}
                <div className="space-y-4 pb-6 border-b border-[#d4af37]/15">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-serif-luxury text-sm font-bold text-[#f3e5ab] uppercase tracking-wider flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#d4af37]" />
                      <span>Bank Account Details (Displayed for Customer Bank Transfer)</span>
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#f3e5ab] text-[10px] uppercase tracking-wider font-semibold w-fit">
                      <Lock className="w-3 h-3 text-[#d4af37]" />
                      <span>Official Locked & Uneditable</span>
                    </span>
                  </div>

                  <p className="text-xs text-gray-400">
                    Official Sri Lankan bank account details displayed to customers at checkout. These credentials are permanently locked to guarantee customer deposit security.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold flex items-center justify-between">
                        <span>Bank Name</span>
                        <Lock className="w-3 h-3 text-gray-500" />
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value="Commercial Bank"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0e0e14] border border-white/10 text-gray-200 text-xs outline-none cursor-not-allowed select-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold flex items-center justify-between">
                        <span>Account Holder Name</span>
                        <Lock className="w-3 h-3 text-gray-500" />
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value="S M Suhail"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0e0e14] border border-white/10 text-gray-200 text-xs outline-none cursor-not-allowed select-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#d4af37] mb-1 font-semibold flex items-center justify-between">
                        <span>Account Number</span>
                        <Lock className="w-3 h-3 text-[#d4af37]/70" />
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value="8021353334"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0e0e14] border border-[#d4af37]/40 text-[#f3e5ab] font-mono text-xs outline-none cursor-not-allowed select-all font-bold tracking-wider"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold flex items-center justify-between">
                        <span>Branch</span>
                        <Lock className="w-3 h-3 text-gray-500" />
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value="Gampola Branch"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0e0e14] border border-white/10 text-gray-200 text-xs outline-none cursor-not-allowed select-all font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold flex items-center justify-between">
                        <span>Customer Bank Transfer Instructions</span>
                        <Lock className="w-3 h-3 text-gray-500" />
                      </label>
                      <textarea
                        rows={2}
                        readOnly
                        disabled
                        value="Please transfer the exact total amount and use your name or phone number as the payment reference. Upload the screenshot/receipt slip below."
                        className="w-full px-4 py-2 rounded-xl bg-[#0e0e14] border border-white/10 text-gray-300 text-xs outline-none cursor-not-allowed select-all font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery & Contact Config */}
                <div className="space-y-4">
                  <h3 className="font-serif-luxury text-sm font-bold text-[#f3e5ab] uppercase tracking-wider">
                    Islandwide Delivery & WhatsApp Hotline
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Standard Islandwide Delivery Fee (Rs.)
                      </label>
                      <input
                        type="number"
                        value={settings.deliveryFee || 0}
                        onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Free Delivery Minimum Order Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        value={settings.freeDeliveryThreshold || 0}
                        onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Official Store WhatsApp Hotline
                      </label>
                      <input
                        type="text"
                        value={settings.whatsappNumber || ''}
                        onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Store Physical Address (Sri Lanka)
                      </label>
                      <input
                        type="text"
                        value={settings.address || ''}
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        placeholder="e.g. Ulapane, Sri Lanka"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Official Instagram Profile URL
                      </label>
                      <input
                        type="text"
                        value={settings.instagramUrl || ''}
                        onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                        placeholder="https://www.instagram.com/scentory.lk"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Store Announcement Banner Text
                      </label>
                      <input
                        type="text"
                        value={settings.announcement || ''}
                        onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  </div>
                </div>

                {/* HOMEPAGE HERO STORY & NARRATIVE HEADLINE SETTINGS */}
                <div className="space-y-4 pb-6 border-b border-[#d4af37]/15">
                  <div>
                    <h3 className="font-serif-luxury text-sm font-bold text-[#f3e5ab] uppercase tracking-wider flex items-center gap-2">
                      <span>🏛️ Homepage Hero Content & Story Narrative</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Customize the main headline, luxury gold badge, and decant narrative description displayed on your storefront homepage.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Hero Top Badge Pill
                      </label>
                      <input
                        type="text"
                        value={settings.heroBadge || "WE'RE LIVE • SCENTORY.LK"}
                        onChange={(e) => setSettings({ ...settings, heroBadge: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                        placeholder="e.g. WE'RE LIVE • SCENTORY.LK"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Headline Line 1
                      </label>
                      <input
                        type="text"
                        value={settings.heroTitle || "A New Destination For Your"}
                        onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                        placeholder="e.g. A New Destination For Your"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Headline Line 2 (Gold Accent)
                      </label>
                      <input
                        type="text"
                        value={settings.heroSubtitle || "Signature Scent."}
                        onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-[#fcf6ba] font-bold text-xs outline-none focus:border-[#d4af37]"
                        placeholder="e.g. Signature Scent."
                      />
                    </div>
                  </div>

                  {/* Hero Description & Decants Textarea */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold flex items-center justify-between">
                      <span>Hero Description & Decant Sizing Narrative</span>
                      <span className="text-[10px] text-[#fcf6ba] font-normal">Editable Storefront Copy</span>
                    </label>
                    <textarea
                      rows={3}
                      value={settings.heroDescription || "Discover artisan extrait de parfum, opulent royal ouds, and custom-decanted atomizers (10ml, 20ml, 50ml, 100ml). Curated exclusively for Sri Lanka’s fragrance lovers with verified bank transfer ordering."}
                      onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] leading-relaxed"
                      placeholder="Enter the description displayed under the hero headline..."
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      This text appears directly beneath the main hero headline on your homepage.
                    </p>
                  </div>
                </div>

                {/* ALL FRAGRANCES COLLECTION (SHOP PAGE) HEADER SETTINGS */}
                <div className="space-y-4 pb-6 border-b border-[#d4af37]/15">
                  <div>
                    <h3 className="font-serif-luxury text-sm font-bold text-[#f3e5ab] uppercase tracking-wider flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#d4af37]" />
                      <span>🛍️ All Fragrances (Shop Page) Header & Description</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Customize the collection badge, main title, and decant sizing description displayed at the top of your shop/all fragrances catalog.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Collection Category Subtitle / Badge
                      </label>
                      <input
                        type="text"
                        value={settings.shopBadge || "Exclusive Fragrance Collection"}
                        onChange={(e) => setSettings({ ...settings, shopBadge: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                        placeholder="e.g. Exclusive Fragrance Collection"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                        Main Shop Title / Headline
                      </label>
                      <input
                        type="text"
                        value={settings.shopTitle || "Distinguished Scents For Every Occasion"}
                        onChange={(e) => setSettings({ ...settings, shopTitle: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37]"
                        placeholder="e.g. Distinguished Scents For Every Occasion"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold flex items-center justify-between">
                        <span>Decants & Currency Description</span>
                        <span className="text-[10px] text-[#fcf6ba] font-normal">Editable Catalog Subtitle</span>
                      </label>
                      <textarea
                        rows={2}
                        value={settings.shopDescription || "Available in precision travel decants (10ml, 20ml) and full flacons (50ml, 100ml). All prices in Sri Lankan Rupees (LKR)."}
                        onChange={(e) => setSettings({ ...settings, shopDescription: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] leading-relaxed"
                        placeholder="e.g. Available in precision travel decants (10ml, 20ml) and full flacons (50ml, 100ml). All prices in Sri Lankan Rupees (LKR)."
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Displayed on the All Fragrances catalog right under the main title.
                      </p>
                    </div>
                  </div>
                </div>

                {/* HOMEPAGE HERO COMMERCIAL FILM & ADJUSTABLE SIZING SETTINGS */}
                <div className="space-y-4 pb-6 border-b border-[#d4af37]/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif-luxury text-sm font-bold text-[#f3e5ab] uppercase tracking-wider flex items-center gap-2">
                        <span>🎬 Homepage Hero Video & Commercial Film</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Upload or replace your commercial video, and adjust framing/size so the full bottle and video are properly visible without cropping.
                      </p>
                    </div>
                    {settings.heroVideoUrl && settings.heroVideoUrl !== '/hero-perfume-video.mp4' && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, heroVideoUrl: '/hero-perfume-video.mp4' })}
                        className="text-[11px] text-[#d4af37] hover:underline cursor-pointer"
                      >
                        Reset to Default Video
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Live Video Preview Box with Real Size & Fit */}
                    <div 
                      className="rounded-2xl overflow-hidden border border-[#d4af37]/30 bg-black/95 mx-auto md:mx-0 w-full relative group shadow-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        maxHeight: '320px',
                        aspectRatio: (settings.heroVideoAspect && settings.heroVideoAspect !== 'auto') ? settings.heroVideoAspect : 'auto'
                      }}
                    >
                      <video
                        key={`${settings.heroVideoUrl || '/hero-perfume-video.mp4'}-${settings.heroVideoFit || 'contain'}-${settings.heroVideoAspect || 'auto'}`}
                        src={settings.heroVideoUrl || '/hero-perfume-video.mp4'}
                        playsInline
                        muted
                        autoPlay
                        loop
                        className={`w-full h-full max-h-72 ${(settings.heroVideoFit || 'contain') === 'contain' ? 'object-contain' : 'object-cover'}`}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[9px] text-[#f3e5ab] font-mono border border-white/10 flex items-center gap-1.5">
                        <span>Live Preview</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-emerald-400 uppercase font-semibold">{(settings.heroVideoFit || 'contain')}</span>
                      </div>
                    </div>

                    {/* Upload Controls, Video Size & Framing Options */}
                    <div className="md:col-span-2 space-y-4">
                      {/* Direct Video URL */}
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                          Direct Video URL (MP4 / WebM / Cloud Storage / CDN)
                        </label>
                        <input
                          type="text"
                          value={settings.heroVideoUrl || ''}
                          onChange={(e) => setSettings({ ...settings, heroVideoUrl: e.target.value })}
                          placeholder="e.g. /hero-perfume-video.mp4 or https://your-cdn.com/perfume.mp4"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] font-mono"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          You can paste any direct video URL from Cloudflare, Supabase, Cloudinary, or AWS S3.
                        </p>
                      </div>

                      {/* Video Framing, Sizing & Fit Controls */}
                      <div className="p-4 rounded-xl bg-[#14141c] border border-[#d4af37]/25 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#fcf6ba] uppercase tracking-wider">
                            Video Sizing & Display Framing Controls
                          </span>
                          <span className="text-[10px] text-emerald-400 font-medium">Proper Full Bottle View</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Video Fit / Cropping Mode */}
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                              Video Fit Mode
                            </label>
                            <select
                              value={settings.heroVideoFit || 'contain'}
                              onChange={(e) => setSettings({ ...settings, heroVideoFit: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] cursor-pointer"
                            >
                              <option value="contain">Contain (Full View - No Cropping)</option>
                              <option value="cover">Cover (Fill Entire Frame)</option>
                            </select>
                            <span className="text-[9px] text-gray-500 mt-0.5 block">
                              "Contain" guarantees the entire perfume bottle is 100% visible.
                            </span>
                          </div>

                          {/* Aspect Ratio Frame */}
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                              Frame Shape (Ratio)
                            </label>
                            <select
                              value={settings.heroVideoAspect || 'auto'}
                              onChange={(e) => setSettings({ ...settings, heroVideoAspect: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] cursor-pointer"
                            >
                              <option value="auto">Auto (Natural Dimensions)</option>
                              <option value="9/16">Vertical Reel (9:16)</option>
                              <option value="4/5">Portrait Post (4:5)</option>
                              <option value="1/1">Square Box (1:1)</option>
                              <option value="16/9">Landscape Film (16:9)</option>
                            </select>
                            <span className="text-[9px] text-gray-500 mt-0.5 block">
                              Adapts to your video without stretching.
                            </span>
                          </div>

                          {/* Video Player Max Height Scale */}
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                              Height Scale
                            </label>
                            <select
                              value={settings.heroVideoHeight || 540}
                              onChange={(e) => setSettings({ ...settings, heroVideoHeight: parseInt(e.target.value, 10) })}
                              className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] cursor-pointer"
                            >
                              <option value="420">Compact (420px)</option>
                              <option value="480">Medium (480px)</option>
                              <option value="540">Standard (540px - Default)</option>
                              <option value="600">Large (600px)</option>
                              <option value="680">Extra Large (680px)</option>
                            </select>
                            <span className="text-[9px] text-gray-500 mt-0.5 block">
                              Adjusts the vertical height of the player.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Upload Video File Directly */}
                      <div className="p-4 rounded-xl border border-dashed border-[#d4af37]/40 bg-[#161622] space-y-2 text-center">
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 30 * 1024 * 1024) {
                                alert('Video file size exceeds 30MB limit. For large files, please paste a direct cloud video URL above.');
                                return;
                              }
                              try {
                                const formData = new FormData();
                                formData.append('video', file);
                                const uploadRes = await fetch('/api/admin/upload-video', {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: formData
                                });
                                const uploadData = await uploadRes.json();
                                if (!uploadRes.ok) throw new Error(uploadData.message || 'Video upload failed');
                                
                                setSettings(prev => ({ ...prev, heroVideoUrl: uploadData.videoUrl }));
                                alert('Commercial video uploaded and set successfully! Click "Save Store Settings" below to publish it live.');
                              } catch (err) {
                                alert('Video upload error: ' + err.message);
                              }
                            }}
                          />
                          <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors">
                            <span className="p-2.5 rounded-full bg-[#202030] text-[#d4af37] border border-[#d4af37]/30">
                              📹 Click to Select & Upload Video File (MP4, WebM)
                            </span>
                            <span className="text-[10px] text-gray-500">
                              Upload a fresh commercial film from your phone or computer
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auto-Refresh & Live Polling Console Settings */}
                <div className="space-y-4 pt-6 border-t border-[#d4af37]/15">
                  <h3 className="font-serif-luxury text-sm font-bold text-[#f3e5ab] uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#d4af37]" />
                    <span>Admin Live Auto-Sync & Refresh Settings</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Control how the Admin Panel checks for incoming customer orders and updates dashboard metrics. Background sync updates data in real-time without reloading the webpage.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#14141c] border border-white/10 space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold">
                        Background Order Auto-Sync
                      </label>
                      <select
                        value={autoSyncInterval}
                        onChange={(e) => {
                          setAutoSyncInterval(e.target.value);
                          localStorage.setItem('scentory_admin_autosync', e.target.value);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 text-white text-xs outline-none focus:border-[#d4af37] cursor-pointer"
                      >
                        <option value="30">Every 30 Seconds (Fastest)</option>
                        <option value="60">Every 1 Minute (Recommended)</option>
                        <option value="120">Every 2 Minutes</option>
                        <option value="300">Every 5 Minutes</option>
                        <option value="600">Every 10 Minutes</option>
                        <option value="0">Manual Refresh Only</option>
                      </select>
                      <span className="text-[10px] text-gray-500 block">
                        Pulls latest orders and bank slip verifications directly from Supabase.
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#14141c] border border-white/10 space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold">
                        Auto-Reload Browser Page Every 10 Mins
                      </label>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !autoPageReload10m;
                            setAutoPageReload10m(next);
                            localStorage.setItem('scentory_admin_pagereload', next ? 'true' : 'false');
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            autoPageReload10m 
                              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {autoPageReload10m ? '✓ Enabled (Reloads every 10 min)' : '✕ Disabled (Silent Sync Only)'}
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-500 block">
                        Optional full browser reload mode. Login session is safely preserved in localStorage.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 transition-all cursor-pointer"
                  >
                    Save All Settings
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Slip Modal Lightbox */}
      {previewSlipUrl && (
        <div
          onClick={() => setPreviewSlipUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] p-3 glass-panel rounded-2xl border border-[#d4af37]/40 shadow-2xl">
            <img src={previewSlipUrl} alt="Bank Slip" className="w-full h-auto max-h-[80vh] object-contain rounded-xl mx-auto" />
            <p className="text-center text-xs text-gray-400 mt-2">Click anywhere to close slip</p>
          </div>
        </div>
      )}
    </div>
  );
}
