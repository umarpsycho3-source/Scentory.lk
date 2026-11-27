import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Gift, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartModal({ onCheckout, onContinueShopping }) {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    dealDiscount,
    freeItemsCount,
    itemsNeeded,
    promotionalDeal,
    deliveryFee,
    finalTotal
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex sm:pl-10">
        <div className="w-full sm:w-[440px] max-w-full bg-[#0e0e13] border-l border-[#d4af37]/30 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-6 border-b border-[#d4af37]/20 flex items-center justify-between bg-[#14141a]">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#d4af37]" />
              <h2 className="font-serif-luxury text-lg tracking-wider text-white uppercase">
                Your Fragrance Bag
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#16161f] border border-[#d4af37]/30 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-[#d4af37]/60" />
                </div>
                <h3 className="font-serif-luxury text-base text-gray-300 mb-2">Your Bag is Empty</h3>
                <p className="text-xs text-gray-400 max-w-xs mb-6">
                  Explore our luxury extrait decants and full signature bottles crafted for distinguished presence.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onContinueShopping();
                  }}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                >
                  Explore Fragrances
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="glass-panel p-4 rounded-xl flex gap-4 relative group"
                >
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-lg border border-[#d4af37]/20 flex-shrink-0 bg-black/50"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-serif-luxury font-medium text-white truncate pr-2">
                        {item.productName}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.productId, item.variantId)}
                        className="text-gray-400 hover:text-red-400 p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-[#d4af37]/10 text-[#f3e5ab] border border-[#d4af37]/20 mt-1">
                      {item.variantSize}
                    </span>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-[#d4af37]/30 rounded-lg bg-[#0a0a0e]">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="px-2 py-1 text-gray-400 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          className="px-2 py-1 text-gray-400 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <span className="text-sm font-semibold text-[#f3e5ab]">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </span>
                        {item.quantity > 1 && (
                          <div className="text-[10px] text-gray-400">
                            Rs. {item.price.toLocaleString()} each
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-6 bg-[#121218] border-t border-[#d4af37]/20 space-y-4">
              {/* Promotional Deal Notification in Cart */}
              {dealDiscount > 0 ? (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-[#121218] border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
                  <span className="flex items-center gap-2 font-bold">
                    <Gift className="w-4 h-4 text-emerald-400 animate-bounce flex-shrink-0" />
                    <span>{promotionalDeal?.title || 'Bundle Promotion'} Applied! ({freeItemsCount} Free)</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-300 whitespace-nowrap">-Rs. {dealDiscount.toLocaleString()}</span>
                </div>
              ) : promotionalDeal?.enabled && itemsNeeded > 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Add <strong>{itemsNeeded}</strong> more fragrance to activate <strong>{promotionalDeal.title}</strong>!</span>
                </div>
              ) : null}

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white">Rs. {subtotal.toLocaleString()}</span>
                </div>
                {dealDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Promotion Discount ({promotionalDeal?.title})</span>
                    <span>-Rs. {dealDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>Estimated Delivery</span>
                  <span className={deliveryFee === 0 ? "text-emerald-400 font-semibold" : "text-white"}>
                    {deliveryFee === 0 ? "FREE" : `Rs. ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-base font-serif-luxury font-bold">
                  <span className="text-white">Estimated Total</span>
                  <span className="gold-text-gradient">Rs. {finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onCheckout();
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2"
                >
                  <span>Proceed To Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-center text-gray-400">
                  🔒 Bank Transfer with Payment Slip verification required at checkout
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
