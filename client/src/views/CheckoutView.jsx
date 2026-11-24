import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Building2, Phone, MapPin, Mail, User, ArrowLeft, ExternalLink, Clock, AlertTriangle, Truck, Store } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function CheckoutView({ onBackToShop, onViewOrders, openAuthModal }) {
  const { user } = useAuth();
  const { cart, subtotal, deliveryFee, clearCart } = useCart();

  // Fulfillment Method: 'delivery' (Rs. 500) vs 'pickup' (FREE - Rs. 0)
  const [fulfillmentType, setFulfillmentType] = useState('delivery');

  // Dynamic calculations based on fulfillment method
  const activeDeliveryFee = fulfillmentType === 'pickup' ? 0 : (deliveryFee || 500);
  const checkoutTotal = subtotal + activeDeliveryFee;

  // Form fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Colombo');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');

  // Slip upload state
  const [bankSlipUrl, setBankSlipUrl] = useState('');
  const [slipFile, setSlipFile] = useState(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Order submission
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Bank details from server
  const [bankSettings, setBankSettings] = useState({
    bankName: 'Commercial Bank of Ceylon',
    accountName: 'SCENTORY LANKA (PVT) LTD',
    accountNumber: '8012398456',
    branch: 'Kollupitiya Branch (Code: 045)',
    swiftCode: 'CCEYLKX',
    instructions: 'Please transfer the exact total amount and use your name or phone number as the payment reference. Upload the screenshot/receipt slip below.'
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.bankDetails) setBankSettings(data.bankDetails);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      if (!name) setName(user.name || '');
      if (!email) setEmail(user.email || '');
      if (!phone) setPhone(user.phone || '');
      if (!address) setAddress(user.address || '');
      if (!city) setCity(user.city || 'Colombo');
    }
  }, [user]);

  // Handle bank slip upload to backend
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadingSlip(true);

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setBankSlipUrl(compressed);
            setSlipFile(file);
            setUploadingSlip(false);
          };
          img.onerror = () => {
            setBankSlipUrl(event.target.result);
            setSlipFile(file);
            setUploadingSlip(false);
          };
          img.src = event.target.result;
        };
        reader.onerror = () => {
          setUploadError('Failed to read payment slip file.');
          setUploadingSlip(false);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setBankSlipUrl(reader.result);
          setSlipFile(file);
          setUploadingSlip(false);
        };
        reader.onerror = () => {
          setUploadError('Failed to read payment slip file.');
          setUploadingSlip(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setUploadError('Failed to process receipt.');
      setUploadingSlip(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderError('');

    // Check mandatory login
    if (!user) {
      setOrderError('You must sign in or register before placing your order.');
      openAuthModal();
      return;
    }

    // Check mandatory slip upload
    if (!bankSlipUrl) {
      setOrderError('Payment Slip is mandatory! Please upload your bank transfer receipt to complete order placement.');
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        customerDetails: {
          name,
          email,
          phone,
          address,
          city,
          postalCode,
          notes
        },
        items: cart,
        fulfillmentType, // 'delivery' | 'pickup'
        deliveryFee: activeDeliveryFee,
        finalTotal: checkoutTotal,
        bankSlipUrl,
        notes
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('scentory_token')}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Order submission failed.');
      }

      // Success
      setPlacedOrder(data.order);
      clearCart();

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // Automatically launch WhatsApp directly on customer device with full order summary
      try {
        let storeWa = (bankSettings?.whatsappNumber || '0763151311').replace(/[^0-9]/g, '');
        if (storeWa.startsWith('0')) storeWa = '94' + storeWa.substring(1);
        if (!storeWa.startsWith('94')) storeWa = '94' + storeWa;

        const isSelfPickup = (data.order.fulfillmentType || fulfillmentType) === 'pickup';
        const fulfillmentMethodText = isSelfPickup ? '🏬 Store / House Pick Up (Ulapane - FREE: Rs. 0)' : '🚚 Islandwide Courier Delivery (Rs. 500)';
        const feeText = isSelfPickup ? 'FREE (Rs. 0 - Self Pick Up)' : 'Rs. 500';

        const waText = encodeURIComponent(
          `*NEW ORDER NOTIFICATION - SCENTORY.LK*\n\n` +
          `*Order ID:* #${data.order.id}\n` +
          `*Customer Name:* ${data.order.customerDetails?.name}\n` +
          `*WhatsApp / Phone:* ${data.order.customerDetails?.phone}\n` +
          `*Fulfillment Method:* ${fulfillmentMethodText}\n` +
          `*Customer Location / Address:* ${data.order.customerDetails?.address}${data.order.customerDetails?.city ? ', ' + data.order.customerDetails?.city : ''}\n` +
          `*Purchased Fragrances:*\n${(data.order.items || []).map(i => `  • ${i.productName || i.name} (${i.variantSize || 'Standard'}) x${i.quantity || 1} - Rs. ${((i.price || 0) * (i.quantity || 1)).toLocaleString()}`).join('\n')}\n\n` +
          `*Delivery Fee:* ${feeText}\n` +
          `*Final Total:* Rs. ${data.order.finalTotal?.toLocaleString()}\n` +
          `*Payment Status:* Bank Transfer Receipt Uploaded\n\n` +
          `_I have placed my order on SCENTORY.LK and uploaded my bank transfer deposit slip. ${isSelfPickup ? 'I will pick up my order in Ulapane.' : 'Please verify and confirm dispatch.'} Thank you!_`
        );
        const autoWhatsAppUrl = `https://wa.me/${storeWa}?text=${waText}`;

        // Direct redirection into the WhatsApp app without mobile popup blocker
        setTimeout(() => {
          window.location.href = autoWhatsAppUrl;
        }, 700);
      } catch (e) {}

    } catch (err) {
      setOrderError(err.message || 'Error processing your order.');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SCREEN WITH ENHANCED ADMIN VERIFICATION & NON-RETURNABLE NOTICE
  if (placedOrder) {
    let storeWa = (bankSettings?.whatsappNumber || '0763151311').replace(/[^0-9]/g, '');
    if (storeWa.startsWith('0')) storeWa = '94' + storeWa.substring(1);
    if (!storeWa.startsWith('94')) storeWa = '94' + storeWa;

    const isOrderPickup = (placedOrder.fulfillmentType || fulfillmentType) === 'pickup';
    const orderFulfillmentTitle = isOrderPickup ? '🏬 Store / House Pick Up (Ulapane - FREE)' : '🚚 Islandwide Courier Delivery (Rs. 500)';
    const orderDeliveryFeeText = isOrderPickup ? 'FREE (Rs. 0)' : 'Rs. 500';

    const whatsappMsg = encodeURIComponent(
      `*NEW ORDER NOTIFICATION - SCENTORY.LK*\n\n` +
      `*Order ID:* #${placedOrder.id}\n` +
      `*Customer Name:* ${placedOrder.customerDetails?.name}\n` +
      `*WhatsApp / Phone:* ${placedOrder.customerDetails?.phone}\n` +
      `*Fulfillment Method:* ${orderFulfillmentTitle}\n` +
      `*Customer Location / Address:* ${placedOrder.customerDetails?.address}${placedOrder.customerDetails?.city ? ', ' + placedOrder.customerDetails?.city : ''}\n` +
      `*Purchased Fragrances:*\n${(placedOrder.items || []).map(i => `  • ${i.productName || i.name} (${i.variantSize || 'Standard'}) x${i.quantity || 1} - Rs. ${((i.price || 0) * (i.quantity || 1)).toLocaleString()}`).join('\n')}\n\n` +
      `*Delivery Fee:* ${orderDeliveryFeeText}\n` +
      `*Final Total:* Rs. ${placedOrder.finalTotal?.toLocaleString()}\n` +
      `*Payment Status:* Bank Transfer Receipt Uploaded\n\n` +
      `_I have placed my order on SCENTORY.LK and uploaded my bank transfer deposit slip. ${isOrderPickup ? 'I will pick up my order in Ulapane.' : 'Please verify and confirm dispatch.'} Thank you!_`
    );
    const whatsappLink = `https://wa.me/${storeWa}?text=${whatsappMsg}`;

    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center animate-in zoom-in-95">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-[#d4af37]/40 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <div className="w-20 h-20 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center mx-auto mb-6 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
            Order Submitted & Bank Slip Uploaded
          </span>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white mt-1 mb-2">
            Awaiting Admin Verification
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-lg mx-auto mb-6 leading-relaxed">
            Thank you, <strong className="text-white">{placedOrder.customerDetails.name}</strong>. Your bank transfer receipt is now in our verification queue. Our admin team will cross-check the deposit with our bank records before dispatching your package.
          </p>

          {/* Order ID Pill */}
          <div className="inline-block px-6 py-3 rounded-2xl bg-[#14141c] border border-[#d4af37]/35 text-white font-mono text-sm mb-6 shadow-inner">
            <span className="text-gray-400">Order Reference: </span>
            <strong className="text-[#f3e5ab] font-bold text-base select-all">{placedOrder.id}</strong>
          </div>

          {/* Anti-Fraud & Return Policy Warning Notice */}
          <div className="p-4 rounded-2xl bg-[#181408] border border-[#d4af37]/35 text-left text-xs text-gray-300 space-y-2 mb-6 max-w-xl mx-auto">
            <div className="flex items-center gap-2 text-[#d4af37] font-semibold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Admin Verification & Policy Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-300">
              • <strong>Slip Inspection</strong>: We verify transactions directly via our bank ledger. Fabricated, unpaid, or invalid slips will result in instant order rejection and blacklist.
            </p>
            <p className="text-[11px] leading-relaxed text-gray-300">
              • <strong>Non-Returnable Policy</strong>: For sanitary reasons and decant integrity, <strong>all approved and dispatched perfume products are strictly non-returnable and non-refundable</strong>.
            </p>
          </div>

          {/* Order Summary Snapshot */}
          <div className="bg-[#0b0b0f] p-4 rounded-2xl border border-white/5 text-left text-xs space-y-2.5 mb-8 max-w-xl mx-auto">
            <div className="flex justify-between text-gray-400">
              <span>Items Ordered:</span>
              <span className="text-white font-medium">{placedOrder.items.length} Fragrances</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Fulfillment Option:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${isOrderPickup ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'}`}>
                {isOrderPickup ? '🏬 Store Pick Up (Ulapane)' : '🚚 Islandwide Courier Delivery'}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Customer Location / Address:</span>
              <span className="text-white truncate max-w-[280px]">{placedOrder.customerDetails.address}{placedOrder.customerDetails.city ? ', ' + placedOrder.customerDetails.city : ''}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Fulfillment Fee:</span>
              <span className={isOrderPickup ? "text-emerald-400 font-bold" : "text-white"}>
                {orderDeliveryFeeText}
              </span>
            </div>
            <div className="flex justify-between text-gray-400 pt-2 border-t border-white/10">
              <span className="font-semibold text-white">Total Paid via Bank Transfer:</span>
              <span className="gold-text-gradient font-bold text-base">Rs. {placedOrder.finalTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400 pt-2 border-t border-white/10">
              <span>Payment Verification Status:</span>
              <span className="text-amber-400 font-bold uppercase tracking-wider">AWAITING ADMIN APPROVAL</span>
            </div>
          </div>

          {/* Automatic WhatsApp Launch Status Pill */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/35 text-emerald-200 text-xs mb-6 max-w-lg mx-auto flex items-center justify-center gap-2.5 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span>Redirecting to WhatsApp automatically with your order details...</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={whatsappLink}
              className="py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Open WhatsApp Chat Now →</span>
            </a>

            <button
              onClick={onViewOrders}
              className="py-3.5 px-6 rounded-xl border border-[#d4af37] text-[#f3e5ab] hover:bg-[#d4af37]/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>View in Profile & Order History</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY CART CHECK
  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif-luxury text-2xl text-white mb-3">Your Bag is Empty</h2>
        <p className="text-xs text-gray-400 mb-6">Select a perfume variant to proceed with order placement.</p>
        <button
          onClick={onBackToShop}
          className="px-6 py-2.5 rounded-full bg-[#d4af37] text-black font-semibold text-xs uppercase tracking-wider"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToShop}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 hover:text-[#d4af37] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shopping</span>
        </button>
        <span className="text-[11px] sm:text-xs text-[#d4af37] font-semibold uppercase tracking-wider">
          Secure Bank Transfer Checkout
        </span>
      </div>

      {/* LOGIN PROMPT (MANDATORY REGISTRATION REQUIREMENT) */}
      {!user && (
        <div className="mb-8 p-6 rounded-2xl bg-[#1a170e] border border-[#d4af37]/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center flex-shrink-0 text-[#d4af37]">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif-luxury font-bold text-white">
                Account Required To Place Order
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Sign in or register to record your delivery address and upload your bank slip proof.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAuthModal}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all whitespace-nowrap cursor-pointer"
          >
            Sign In / Register Now
          </button>
        </div>
      )}

      {orderError && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{orderError}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Customer Details & Bank Transfer Payment Section */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Customer Details */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#d4af37]/25 space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-[#d4af37]/15">
                <div className="w-7 h-7 rounded-full bg-[#d4af37] text-black font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider">
                  Fulfillment & Customer Details
                </h3>
              </div>

              {/* FULFILLMENT METHOD SELECTOR (ISLANDWIDE DELIVERY VS LOCAL PICK UP) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                    Choose Order Fulfillment Method *
                  </label>
                  <span className="text-[10px] text-gray-400">Select pickup to avoid delivery fees</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: Islandwide Courier Delivery */}
                  <div
                    onClick={() => setFulfillmentType('delivery')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                      fulfillmentType === 'delivery'
                        ? 'bg-gradient-to-br from-[#1c180f] to-[#2b2210] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.22)] ring-1 ring-[#d4af37]'
                        : 'bg-[#121218] border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          fulfillmentType === 'delivery'
                            ? 'bg-[#d4af37] text-black shadow-md'
                            : 'bg-white/5 text-gray-400'
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Islandwide Delivery
                          </h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Doorstep courier delivery across Sri Lanka
                          </span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        fulfillmentType === 'delivery'
                          ? 'border-[#d4af37] bg-[#d4af37]'
                          : 'border-white/30'
                      }`}>
                        {fulfillmentType === 'delivery' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                      <span className="text-gray-400 text-[11px]">Courier Delivery Fee:</span>
                      <span className="text-[#f3e5ab] font-bold">Rs. 500</span>
                    </div>
                  </div>

                  {/* Option 2: Store / House Pick Up (Local to Ulapane) */}
                  <div
                    onClick={() => setFulfillmentType('pickup')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                      fulfillmentType === 'pickup'
                        ? 'bg-gradient-to-br from-[#0e1d16] to-[#142e22] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500'
                        : 'bg-[#121218] border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          fulfillmentType === 'pickup'
                            ? 'bg-emerald-400 text-black shadow-md'
                            : 'bg-white/5 text-gray-400'
                        }`}>
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Store / House Pick Up
                            </h4>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Free
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Collect near our house in Ulapane (Gampola)
                          </span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        fulfillmentType === 'pickup'
                          ? 'border-emerald-400 bg-emerald-400'
                          : 'border-white/30'
                      }`}>
                        {fulfillmentType === 'pickup' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                      <span className="text-gray-400 text-[11px]">Local Pick Up Charge:</span>
                      <span className="text-emerald-400 font-bold">FREE (Rs. 0)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Customer Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kasun Fernando"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121218] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#d4af37] mb-1">
                    WhatsApp Contact Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-[#d4af37]" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +94 77 123 4567"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121218] border border-[#d4af37]/40 text-white text-xs focus:border-[#d4af37] outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Email Address (Gmail / Email) *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121218] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    {fulfillmentType === 'pickup'
                      ? 'Your Residential / Contact Address (Ulapane / Surrounding Area) *'
                      : 'Doorstep Courier Delivery Address in Sri Lanka *'}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={
                        fulfillmentType === 'pickup'
                          ? "e.g. House No, Village / Road name near Ulapane, Gampola"
                          : "House No, Street Name, Apartment / Area"
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121218] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                    />
                  </div>
                  {fulfillmentType === 'pickup' && (
                    <p className="text-[11px] text-emerald-400/95 mt-1.5 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Pick up directly in Ulapane for FREE. Please enter your location so we can identify you when you arrive.</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={fulfillmentType === 'pickup' ? "e.g. Ulapane, Gampola, Nawalapitiya" : "e.g. Colombo, Kandy, Galle"}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121218] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Postal Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 00300"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121218] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    {fulfillmentType === 'pickup' ? 'Pick Up Notes / Expected Date & Time (Optional)' : 'Order / Delivery Notes (Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      fulfillmentType === 'pickup'
                        ? "e.g. I will come to pick up on Friday afternoon after 3 PM"
                        : "Special instructions for courier..."
                    }
                    className="w-full px-4 py-2 rounded-xl bg-[#121218] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Sri Lankan Bank Details & Upload Slip */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#d4af37]/35 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/15">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#d4af37] text-black font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider">
                    Bank Transfer & Receipt Proof
                  </h3>
                </div>
                <span className="text-[10px] text-gray-400 border border-white/10 px-2 py-0.5 rounded-full">
                  Admin Slip Verified
                </span>
              </div>

              {/* Bank Account Details Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#19160e] via-[#121218] to-[#0c0c10] border border-[#d4af37]/40 shadow-xl space-y-3">
                <div className="flex items-center gap-2.5 text-[#f3e5ab]">
                  <Building2 className="w-5 h-5 text-[#d4af37]" />
                  <span className="font-serif-luxury text-sm font-bold tracking-wider">
                    {bankSettings.bankName}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase">Account Name</span>
                    <strong className="text-white text-xs tracking-wide">{bankSettings.accountName}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-[#d4af37]/30">
                    <span className="text-[#d4af37] block text-[10px] uppercase font-semibold">Account Number</span>
                    <strong className="text-[#f3e5ab] text-sm tracking-widest font-mono font-bold select-all">
                      {bankSettings.accountNumber}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase">Branch</span>
                    <span className="text-white text-xs">{bankSettings.branch}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase">Transfer Reference</span>
                    <span className="text-amber-400 text-xs font-medium">Your Name / WhatsApp No</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-300 leading-relaxed pt-1">
                  💡 {bankSettings.instructions}
                </p>

                {/* Live Payable Amount Badge */}
                <div className="p-3.5 rounded-xl bg-black/60 border border-[#d4af37]/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Payable Amount ({fulfillmentType === 'pickup' ? 'Free Pick Up' : 'Courier Included'})</span>
                    <strong className={fulfillmentType === 'pickup' ? "text-emerald-400 font-semibold text-xs" : "text-gray-300 font-semibold text-xs"}>
                      {fulfillmentType === 'pickup' ? '✓ Free Pick Up (Delivery fee Rs. 0)' : 'Includes Rs. 500 islandwide courier'}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px] uppercase">Amount to Transfer</span>
                    <span className="text-base sm:text-lg font-serif-luxury font-bold gold-text-gradient">
                      Rs. {checkoutTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* MANDATORY PAYMENT SLIP UPLOAD */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-serif-luxury font-bold uppercase tracking-wider text-[#f3e5ab] flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#d4af37]" />
                    <span>Upload Bank Transfer Deposit Slip *</span>
                  </label>
                  <span className="text-[10px] text-rose-400 font-semibold uppercase">
                    Mandatory To Place Order
                  </span>
                </div>

                <div className="relative border-2 border-dashed border-[#d4af37]/40 hover:border-[#d4af37] rounded-2xl p-6 text-center transition-all bg-[#0a0a0e]/60">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="bank-slip-input"
                  />

                  {uploadingSlip ? (
                    <div className="py-4 space-y-2">
                      <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-[#f3e5ab]">Uploading payment receipt...</p>
                    </div>
                  ) : bankSlipUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Receipt Slip Successfully Uploaded!</span>
                      </div>

                      {/* Preview */}
                      {bankSlipUrl.startsWith('data:application/pdf') || (slipFile && slipFile.name?.toLowerCase().endsWith('.pdf')) ? (
                        <div className="p-3 mx-auto max-w-sm rounded-xl bg-[#1c1c28] border border-[#d4af37]/40 flex items-center justify-between gap-3 text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xs uppercase">
                              PDF
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white truncate max-w-[160px]">{slipFile?.name || 'Bank_Deposit_Slip.pdf'}</p>
                              <p className="text-[10px] text-gray-400">{slipFile?.size ? `${(slipFile.size / 1024).toFixed(1)} KB` : 'PDF Document'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-[#d4af37] border border-[#d4af37]/40 px-2 py-1 rounded-md">Attached</span>
                        </div>
                      ) : (
                        <div className="w-48 h-32 mx-auto rounded-xl overflow-hidden border border-[#d4af37]/30 bg-black/50 shadow-md">
                          <img
                            src={bankSlipUrl}
                            alt="Slip Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <p className="text-[11px] text-gray-400">
                        Click or drag to replace receipt slip if needed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-[#181822] border border-[#d4af37]/30 flex items-center justify-center mx-auto text-[#d4af37]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-gray-200">
                        Click or drag & drop your Payment Receipt Screenshot / PDF
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Supports JPEG, PNG, WEBP, PDF up to 15MB
                      </p>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Confirm Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/30 shadow-xl space-y-5 sticky top-28">
              <h3 className="font-serif-luxury text-base font-bold text-white uppercase tracking-wider pb-3 border-b border-[#d4af37]/20 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-sans text-gray-400">({cart.length} Fragrances)</span>
              </h3>

              {/* Items in Checkout */}
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-3 items-center text-xs">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-12 h-12 rounded-lg object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{item.productName}</h4>
                      <span className="text-[10px] text-[#d4af37]">{item.variantSize} x {item.quantity}</span>
                    </div>
                    <span className="text-right text-gray-200 font-semibold">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span className="flex items-center gap-1.5">
                    {fulfillmentType === 'pickup' ? (
                      <Store className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-[#d4af37]" />
                    )}
                    <span>{fulfillmentType === 'pickup' ? 'Store / House Pick Up' : 'Islandwide Delivery'}</span>
                  </span>
                  <span className={activeDeliveryFee === 0 ? "text-emerald-400 font-bold" : "text-white font-semibold"}>
                    {activeDeliveryFee === 0 ? "FREE (Rs. 0)" : `Rs. ${activeDeliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-baseline text-lg font-serif-luxury font-bold">
                  <span className="text-white text-sm uppercase tracking-wider">Final Total</span>
                  <span className="gold-text-gradient text-xl">Rs. {checkoutTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Validation Badges */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className={user ? 'text-gray-300' : 'text-rose-400'}>
                    {user ? `Customer Signed In: ${user.email}` : 'Customer Login / Registration Required'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${bankSlipUrl ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className={bankSlipUrl ? 'text-gray-300' : 'text-rose-400'}>
                    {bankSlipUrl ? 'Payment Slip Attached' : 'Bank Slip Upload Pending (Required)'}
                  </span>
                </div>
              </div>

              {/* Submit Order Button */}
              <button
                type="submit"
                disabled={submitting || !user || !bankSlipUrl}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-[0_0_25px_rgba(212,175,55,0.4)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>Submitting Order...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Order For Admin Review</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-gray-400 leading-normal">
                🔒 Orders are reviewed and verified before dispatch. All perfume decant sales are non-returnable upon dispatch.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
