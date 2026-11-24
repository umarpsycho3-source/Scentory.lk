import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Mail, Package, ShieldCheck, AlertTriangle, ExternalLink, Lock, Check, Save, Star, Heart, ArrowRight, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFavourites } from '../context/FavouritesContext';
import AddReviewModal from '../components/AddReviewModal';

export default function UserProfileView({ onBackToShop, onSelectProduct, openAuthModal, initialTab = 'orders' }) {
  const { user, token, updateUser, logout } = useAuth();
  const { favourites, toggleFavourite, favouritesCount } = useFavourites();

  const [activeTab, setActiveTab] = useState(initialTab || 'orders'); // 'orders' | 'profile' | 'favourites' | 'policy'
  const [orders, setOrders] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fetch store products for favourites list
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        const prods = Array.isArray(data) ? data : (data?.products || []);
        setCatalogProducts(prods);
      })
      .catch(() => {});
  }, []);

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setCity(user.city || '');
    }
  }, [user]);

  const fetchOrders = () => {
    if (!token) {
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    fetch('/api/orders/my-orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif-luxury text-2xl text-white mb-3">Sign In Required</h2>
        <p className="text-xs text-gray-400 mb-6">Please log in to manage your customer profile and track your orders.</p>
        <button
          onClick={openAuthModal}
          className="px-6 py-2.5 rounded-full bg-[#d4af37] text-black font-semibold text-xs uppercase tracking-wider"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          city,
          password: newPassword ? newPassword : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile.');

      updateUser(data.user);
      setSaveSuccess(true);
      setNewPassword('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintBill = (order) => {
    if (!order) return;
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      alert('Please allow popups in your browser to print your invoice.');
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
    const deliveryFee = order.deliveryFee !== undefined ? order.deliveryFee : 500;
    const finalTotal = order.finalTotal || order.totalAmount || (subtotal + deliveryFee);
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
            <button onclick="window.print()" style="background: #d4af37; color: #000; border: none; font-weight: 700; padding: 10px 22px; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">
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
                    CUSTOMER & DELIVERY DETAILS
                  </div>
                  <div style="font-size: 14px; font-weight: 700; color: #111827;">${order.customerDetails?.name || user?.name || 'Customer'}</div>
                  <div style="color: #4b5563; margin-top: 2px;">WhatsApp: <strong>${order.customerDetails?.phone || user?.phone || 'N/A'}</strong></div>
                  <div style="color: #4b5563;">Email: ${order.customerDetails?.email || user?.email || 'N/A'}</div>
                  <div style="color: #4b5563; margin-top: 4px;">
                    Delivery Address: <strong>${order.customerDetails?.address || user?.address || 'N/A'}${order.customerDetails?.city ? ', ' + order.customerDetails?.city : ''}</strong>
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; border-left: 1px solid #e5e7eb; padding-left: 15px;">
                  <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                    PAYMENT & STATUS
                  </div>
                  <div style="color: #4b5563;">Payment: <strong>Direct Bank Deposit / Transfer</strong></div>
                  <div style="color: #4b5563; margin-top: 2px;">Bank: <strong>Commercial Bank of Ceylon</strong></div>
                  <div style="margin-top: 4px;">
                    Slip Status: 
                    <span class="badge-verified">${order.paymentStatus === 'verified' ? '✓ Bank Slip Verified' : (order.paymentStatus === 'rejected' ? '✗ Slip Rejected' : 'Awaiting Slip Verification')}</span>
                  </div>
                  <div style="color: #4b5563; margin-top: 4px;">
                    Fulfillment: <strong style="text-transform: uppercase;">${order.orderStatus || 'Processing'}</strong>
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
            <tr>
              <td style="color: #4b5563;">Islandwide Courier Delivery:</td>
              <td style="text-align: right; font-weight: 600;">Rs. ${deliveryFee.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td style="padding-top: 8px;">Grand Total (LKR):</td>
              <td style="padding-top: 8px; text-align: right; color: #0b0b0e;">Rs. ${finalTotal.toLocaleString()}</td>
            </tr>
          </table>

          <div class="footer">
            <p style="margin: 0; font-weight: 600; color: #111827;">Thank you for ordering with SCENTORY.LK!</p>
            <p style="margin: 4px 0 0 0;">Official Support WhatsApp: 0763151311 | Ulapane, Sri Lanka</p>
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

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Bank Slip Verified</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-500/40 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Slip Rejected / Invalid Slip</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/40 uppercase flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Awaiting Admin Verification</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-300">
      {/* Luxury Customer Header Card (Inspired by User's Reference with Glowing Halo Avatar) */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-[#12121a] via-[#0d0d14] to-[#08080c] border border-[#d4af37]/30 shadow-2xl relative overflow-hidden">
        {/* Ambient gold glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Glowing Avatar */}
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] blur-md opacity-60 animate-pulse" />
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-extrabold text-2xl sm:text-3xl uppercase flex items-center justify-center font-serif-luxury shadow-xl ring-2 ring-black select-none">
                {user.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
              </div>
            </div>

            <div className="space-y-1">
              <div className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest ${
                user.isPremium 
                  ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/25 border border-[#d4af37] text-[#fcf6ba] shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                  : 'bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#fcf6ba]'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-ping" />
                {user.isPremium ? '👑 VIP Premium Connoisseur Member' : 'Verified Member'}
              </div>
              <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-white tracking-wide">
                {user.name}
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                {user.email} {user.phone && <span>• WhatsApp: <span className="text-[#d4af37]">{user.phone}</span></span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToShop}
              className="px-4 py-2 rounded-xl bg-[#14141c] hover:bg-[#d4af37]/15 border border-[#d4af37]/30 text-xs text-[#f3e5ab] font-medium transition-colors cursor-pointer"
            >
              Explore Fragrances &rarr;
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs text-red-300 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Icon-Only Navigation Tabs (Icons Only as requested: Zero text clipping on mobile) */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#d4af37]/20 flex-wrap gap-4">
        <div className="inline-flex items-center gap-2 sm:gap-3 p-1.5 rounded-2xl bg-[#111119] border border-[#d4af37]/30 shadow-lg">
          {/* Icon 1: Orders & Slip Verification */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            title="My Orders & Bank Slips"
            aria-label="My Orders & Bank Slips"
            className={`relative p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black shadow-[0_0_15px_rgba(212,175,55,0.45)] scale-105'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            {orders.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono ${
                  activeTab === 'orders'
                    ? 'bg-black text-[#d4af37] border border-[#d4af37]'
                    : 'bg-[#d4af37] text-black shadow'
                }`}
              >
                {orders.length}
              </span>
            )}
          </button>

          {/* Icon 2: Personal Details & Shipping Address */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            title="Personal Profile & Address"
            aria-label="Personal Profile & Address"
            className={`p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black shadow-[0_0_15px_rgba(212,175,55,0.45)] scale-105'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Icon 3: My Favourites / Wishlist */}
          <button
            type="button"
            onClick={() => setActiveTab('favourites')}
            title="My Favourites & Wishlist"
            aria-label="My Favourites & Wishlist"
            className={`relative p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'favourites'
                ? 'bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black shadow-[0_0_15px_rgba(212,175,55,0.45)] scale-105'
                : 'text-gray-400 hover:text-rose-400 hover:bg-white/5'
            }`}
          >
            <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === 'favourites' ? 'fill-black text-black' : (favouritesCount > 0 ? 'fill-rose-500 text-rose-500' : '')}`} />
            {favouritesCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono ${
                  activeTab === 'favourites'
                    ? 'bg-black text-rose-400 border border-rose-500'
                    : 'bg-rose-500 text-white shadow'
                }`}
              >
                {favouritesCount}
              </span>
            )}
          </button>
        </div>

        {/* Current Active Section Heading Label */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Viewing:</span>
          <span className="text-xs uppercase tracking-wider font-bold gold-text-gradient font-serif-luxury">
            {activeTab === 'orders' && `My Orders & Bank Slips (${orders.length})`}
            {activeTab === 'profile' && 'Profile & Shipping Address'}
            {activeTab === 'favourites' && `My Saved Fragrances (${favouritesCount})`}
          </span>
        </div>
      </div>

      {/* TAB 1: ORDERS & BANK SLIP VERIFICATION STATUS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {loadingOrders ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-400">Loading order records...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center border border-[#d4af37]/20">
              <Package className="w-12 h-12 text-[#d4af37]/50 mx-auto mb-3" />
              <h3 className="font-serif-luxury text-base text-white mb-2">No Fragrance Orders Found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
                Explore our signature collection of hand-decanted extraits and full flacons with verified bank transfer.
              </p>
              <button
                onClick={onBackToShop}
                className="px-6 py-2.5 rounded-full bg-[#d4af37] text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-all"
              >
                Explore Fragrances
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="glass-panel rounded-2xl border border-[#d4af37]/25 overflow-hidden shadow-xl"
                >
                  {/* Top Bar */}
                  <div className="p-5 bg-[#14141c] border-b border-[#d4af37]/15 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-white tracking-wider">
                          {order.id}
                        </span>
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block uppercase">Total</span>
                        <span className="font-serif-luxury text-base font-bold gold-text-gradient">
                          Rs. {order.finalTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right pl-4 border-l border-white/10 hidden sm:block">
                        <span className="text-[10px] text-gray-400 block uppercase">Fulfillment</span>
                        <span className="text-xs font-semibold text-white uppercase">{order.orderStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-5 space-y-4">
                    <div className="divide-y divide-white/5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-12 h-12 rounded-lg object-cover border border-white/10 bg-black/40"
                            />
                            <div>
                              <h4 className="font-medium text-white">{item.productName}</h4>
                              <span className="text-[10px] text-[#d4af37]">{item.variantSize} x {item.quantity}</span>
                            </div>
                          </div>
                          <span className="font-semibold text-white">Rs. {item.subtotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    {/* Verification Details Box */}
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                          Delivery Destination
                        </span>
                        <p className="text-gray-200">{order.customerDetails.address}, {order.customerDetails.city}</p>
                        <p className="text-[#d4af37] text-[11px] mt-0.5 font-mono">WhatsApp: {order.customerDetails.phone}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                          Uploaded Bank Transfer Slip & Review
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {order.bankSlipUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedSlip(order.bankSlipUrl)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181824] hover:bg-[#252535] text-[#f3e5ab] text-xs border border-[#d4af37]/30 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Inspect Slip</span>
                            </button>
                          ) : (
                            <span className="text-rose-400">No slip attached</span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const pName = order.items?.[0]?.productName || 'Signature Fragrance';
                              const vSize = order.items?.[0]?.variantSize ? ` (${order.items[0].variantSize})` : '';
                              setReviewProduct(`${pName}${vSize}`);
                              setIsReviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4af37]/20 hover:bg-[#d4af37]/35 text-[#f3e5ab] text-xs border border-[#d4af37]/50 transition-colors font-medium cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 text-[#d4af37] fill-[#d4af37]" />
                            <span>Add Rating & Review</span>
                          </button>
                        </div>
                        {order.adminNotes && (
                          <p className="text-[11px] text-amber-300 mt-1 italic">
                            Admin Note: "{order.adminNotes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERSONAL DETAILS & SHIPPING ADDRESS */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#d4af37]/25 space-y-6 max-w-2xl">
          <div className="border-b border-[#d4af37]/15 pb-4">
            <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider">
              Personal Information & Courier Address
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Ensure your WhatsApp number and shipping details are accurate for smooth courier dispatch.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Personal details updated successfully!</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#d4af37] mb-1 font-semibold">
                WhatsApp Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-[#d4af37]" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-[#d4af37]/40 text-white text-xs focus:border-[#d4af37] outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                Email Address (Gmail / Account Login)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0c0c10] border border-white/5 text-gray-400 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                Delivery Street Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street name, house/flat number, landmark"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                City / District *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Colombo, Kandy, Galle"
                className="w-full px-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1 font-semibold">
                Change Password (Optional)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty to keep current"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141c] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Details'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: MY CURATED FAVOURITES / WISHLIST */}
      {activeTab === 'favourites' && (() => {
        const favouriteItems = catalogProducts.filter(p => favourites.includes(p.id));

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider">
                  Saved Signature Masterpieces ({favouriteItems.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Your hand-picked fragrance bookmarks. Ready for quick selection and bank transfer ordering.
                </p>
              </div>
            </div>

            {favouriteItems.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl border border-white/10 text-center max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                  <Heart className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-serif-luxury text-base font-bold text-white">No Favourites Saved Yet</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Tap the heart icon on any perfume card in the collection to pin your favorite signature scents here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBackToShop}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
                >
                  Explore All Fragrances
                </button>
              </div>
            ) : (
              /* 2 In 1 Row on Mobile & Compact */
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
                {favouriteItems.map((prod) => {
                  const lowestPrice = Math.min(...(prod.variants || []).map(v => v.discountPrice || v.price));

                  return (
                    <div
                      key={prod.id}
                      onClick={() => onSelectProduct ? onSelectProduct(prod) : onBackToShop()}
                      className="glass-panel rounded-2xl border border-white/10 hover:border-[#d4af37]/45 transition-all flex flex-col justify-between overflow-hidden group bg-[#0e0e15] cursor-pointer"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-black/60">
                        <img
                          src={prod.images?.[0]}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Remove Favourite Heart Icon */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(prod.id);
                          }}
                          title="Remove from favourites"
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-rose-500 hover:scale-110 active:scale-90 transition-all cursor-pointer shadow-lg"
                        >
                          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                        </button>
                      </div>

                      <div className="p-3 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-[#d4af37] font-semibold block line-clamp-1">
                            {prod.scentFamily}
                          </span>
                          <h4 className="font-serif-luxury text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-[#f3e5ab] transition-colors">
                            {prod.name}
                          </h4>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase block">Starts from</span>
                            <span className="font-serif-luxury text-xs sm:text-sm font-bold gold-text-gradient">
                              Rs. {lowestPrice.toLocaleString()}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectProduct) {
                                onSelectProduct(prod);
                              } else {
                                onBackToShop();
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#fcf6ba] text-black font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                          >
                            Order
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Slip Modal Lightbox */}
      {selectedSlip && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full max-h-[90vh] p-4 glass-panel rounded-2xl border border-[#d4af37]/40 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="font-serif-luxury text-sm font-bold text-white uppercase tracking-wider">
                Bank Transfer Receipt Preview
              </h4>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {selectedSlip.startsWith('data:application/pdf') || selectedSlip.endsWith('.pdf') ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-white/10 h-96 bg-white">
                  <iframe src={selectedSlip} title="PDF Slip" className="w-full h-full" />
                </div>
                <div className="flex justify-end">
                  <a
                    href={selectedSlip}
                    download="Bank_Transfer_Slip.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Download / Open Full PDF</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="max-h-[75vh] overflow-hidden rounded-xl bg-black/60 flex items-center justify-center p-2">
                <img src={selectedSlip} alt="Bank Slip" className="w-full h-auto max-h-[70vh] object-contain rounded-xl mx-auto" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Write Review Modal from Customer Profile */}
      <AddReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        preselectedProduct={reviewProduct}
        onReviewAdded={() => {
          setIsReviewModalOpen(false);
          alert('Thank you! Your verified review and rating have been posted.');
        }}
      />
    </div>
  );
}
