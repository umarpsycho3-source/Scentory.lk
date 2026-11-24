import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, AlertTriangle, ArrowLeft, ExternalLink, Printer, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MyOrdersView({ onBackToShop, openAuthModal }) {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/orders/my-orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif-luxury text-2xl text-white mb-3">Sign In To View Orders</h2>
        <p className="text-xs text-gray-400 mb-6">Access your order history, bank slip status, and delivery tracking.</p>
        <button
          onClick={openAuthModal}
          className="px-6 py-2.5 rounded-full bg-[#d4af37] text-black font-semibold text-xs uppercase tracking-wider"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 uppercase">Payment Verified</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-500/40 uppercase">Payment Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/40 uppercase">Slip Verification Pending</span>;
    }
  };

  const getOrderBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="text-emerald-400 font-semibold uppercase">Delivered</span>;
      case 'shipped':
        return <span className="text-blue-400 font-semibold uppercase">Dispatched / Shipped</span>;
      case 'processing':
        return <span className="text-amber-400 font-semibold uppercase">Processing Order</span>;
      default:
        return <span className="text-gray-300 font-semibold uppercase">Order Placed</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={onBackToShop}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 hover:text-[#d4af37] mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Fragrances</span>
          </button>
          <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-white tracking-wide">
            My Orders & Bank Slips
          </h1>
          <p className="text-xs text-gray-400">
            Account: <span className="text-[#f3e5ab]">{user.name}</span> ({user.email})
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-[#d4af37]/20">
          <Package className="w-12 h-12 text-[#d4af37]/50 mx-auto mb-4" />
          <h3 className="font-serif-luxury text-lg text-white mb-2">No Orders Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
            You haven't placed any orders with us yet. Explore our handcrafted decants and signature extraits.
          </p>
          <button
            onClick={onBackToShop}
            className="px-6 py-2.5 rounded-full bg-[#d4af37] text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-all"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-panel rounded-2xl border border-[#d4af37]/25 overflow-hidden shadow-xl"
            >
              {/* Order Header */}
              <div className="p-4 sm:p-6 bg-[#14141c] border-b border-[#d4af37]/15 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white tracking-wider">
                      {order.id}
                    </span>
                    {getStatusBadge(order.paymentStatus)}
                  </div>
                  <span className="text-[11px] text-gray-400 block">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block uppercase">Total Amount</span>
                    <span className="font-serif-luxury text-base font-bold gold-text-gradient">
                      Rs. {order.finalTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right pl-4 border-l border-white/10 hidden sm:block">
                    <span className="text-[10px] text-gray-400 block uppercase">Fulfillment</span>
                    <span className="text-xs">{getOrderBadge(order.orderStatus)}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 sm:p-6 space-y-4">
                <div className="divide-y divide-white/5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-14 h-14 object-cover rounded-xl border border-white/10 bg-black/40"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">{item.productName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#d4af37]/15 text-[#f3e5ab] border border-[#d4af37]/20">
                            {item.variantSize}
                          </span>
                          <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        Rs. {item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Delivery & Payment Slip Verification Info */}
                <div className="pt-4 border-t border-[#d4af37]/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-black/20 p-4 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">
                        {order.fulfillmentType === 'pickup' ? 'Fulfillment: Store Pick Up' : 'Delivery Address'}
                      </span>
                      {order.fulfillmentType === 'pickup' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          Free Pick Up (Ulapane)
                        </span>
                      )}
                    </div>
                    <p className="text-gray-200">{order.customerDetails.address}{order.customerDetails.city ? ', ' + order.customerDetails.city : ''}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">WhatsApp: {order.customerDetails.phone}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-semibold mb-1">
                      Uploaded Payment Slip
                    </span>
                    {order.bankSlipUrl ? (
                      <button
                        onClick={() => setSelectedSlip(order.bankSlipUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a24] hover:bg-[#252535] text-[#f3e5ab] text-xs border border-[#d4af37]/30 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Uploaded Bank Slip</span>
                      </button>
                    ) : (
                      <span className="text-rose-400 text-xs">No slip uploaded</span>
                    )}
                    {order.adminNotes && (
                      <p className="text-[11px] text-amber-300 mt-2 italic">
                        Note from Scentory: "{order.adminNotes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal for Viewing Uploaded Slip */}
      {selectedSlip && (
        <div
          onClick={() => setSelectedSlip(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] p-2 glass-panel rounded-2xl border border-[#d4af37]/40 shadow-2xl">
            <img
              src={selectedSlip}
              alt="Bank Transfer Slip"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl mx-auto"
            />
            <p className="text-center text-xs text-gray-400 mt-2">Click anywhere to close slip preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
