import React, { useState } from 'react';
import { ArrowLeft, Check, ShoppingBag, Zap, ShieldCheck, Truck, RefreshCw, MessageCircle, Heart, Star, Sparkles, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../context/FavouritesContext';

export default function ProductDetailView({ product, onBack, onCheckoutNow }) {
  const { addToCart, setIsCartOpen, promotionalDeal, isProductDealEligible } = useCart();
  const { toggleFavourite, isFavourite } = useFavourites();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isCopied, setIsCopied] = useState(false);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-serif-luxury text-white mb-4">Fragrance Not Found</h2>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-full bg-[#d4af37] text-black font-semibold text-xs tracking-wider uppercase"
        >
          Return To Fragrances
        </button>
      </div>
    );
  }

  const variants = product.variants && product.variants.length > 0 ? product.variants : [
    { id: 'def_10ml', size: '10ml Spray', price: 3500, discountPrice: null, stock: 20 }
  ];

  const currentVariant = variants[selectedVariantIndex] || variants[0];
  const unitPrice = currentVariant.discountPrice || currentVariant.price;
  const hasDiscount = currentVariant.discountPrice && currentVariant.discountPrice < currentVariant.price;
  const discountPercent = hasDiscount
    ? Math.round(((currentVariant.price - currentVariant.discountPrice) / currentVariant.price) * 100)
    : 0;

  const handleAddToCart = () => {
    addToCart(product, currentVariant, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, currentVariant, quantity);
    setIsCartOpen(false);
    onCheckoutNow();
  };

  // WhatsApp order link
  const whatsappNumber = '94763151311';
  const whatsappMessage = encodeURIComponent(
    `Hello SCENTORY.LK! I am interested in ordering:\n- Fragrance: ${product.name}\n- Variant: ${currentVariant.size}\n- Price: Rs. ${unitPrice.toLocaleString()}\n- Qty: ${quantity}\nPlease let me know availability.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:py-12 animate-in fade-in duration-300 overflow-x-hidden">
      {/* Breadcrumb / Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-gray-400 hover:text-[#d4af37] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Collection</span>
        </button>
        <span className="text-xs text-gray-400 uppercase tracking-widest">
          {product.gender || 'Unisex'} • {product.scentFamily || 'Extrait'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: HD Images Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden glass-panel border border-[#d4af37]/30 shadow-[0_15px_40px_rgba(0,0,0,0.7)] group">
            <img
              src={product.images?.[selectedImage] || product.images?.[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {product.badge && (
              <div className="absolute top-4 left-4 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {product.badge}
              </div>
            )}
            {/* Favourite Heart Action Button */}
            <button
              type="button"
              onClick={() => toggleFavourite(product.id)}
              title={isFavourite(product.id) ? "Remove from favourites" : "Add to favourites"}
              aria-label="Toggle favourite"
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-xl cursor-pointer"
            >
              <Heart className={`w-5 h-5 transition-colors ${isFavourite(product.id) ? 'fill-rose-500 text-rose-500' : 'text-white hover:text-rose-400'}`} />
            </button>

            {hasDiscount && (
              <div className="absolute top-4 right-16 px-3 py-1 rounded-full bg-rose-900/90 border border-rose-500/50 text-rose-200 text-xs font-bold uppercase tracking-wider">
                {discountPercent}% OFF
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    selectedImage === idx
                      ? 'border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-105'
                      : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Guarantee Badges */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#d4af37]/15">
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#121216]/60 border border-white/5">
              <ShieldCheck className="w-5 h-5 text-[#d4af37] mb-1.5" />
              <span className="text-[11px] font-semibold text-gray-200">100% Authentic</span>
              <span className="text-[9px] text-gray-400">Direct Niche Decants</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#121216]/60 border border-white/5">
              <Truck className="w-5 h-5 text-[#d4af37] mb-1.5" />
              <span className="text-[11px] font-semibold text-gray-200">Islandwide Courier</span>
              <span className="text-[9px] text-gray-400">1-3 Days Colombo & Beyond</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#121216]/60 border border-white/5">
              <RefreshCw className="w-5 h-5 text-[#d4af37] mb-1.5" />
              <span className="text-[11px] font-semibold text-gray-200">Bank Transfer</span>
              <span className="text-[9px] text-gray-400">Verified Payment Slip</span>
            </div>
          </div>
        </div>

        {/* Right Column: Details, Creative Variant Selector & Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-2">
              <span>{product.scentFamily}</span>
              <span>•</span>
              <span className="capitalize">{product.gender} Fragrance</span>
            </div>
            <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-wide">
              {product.name}
            </h1>
            <p className="text-sm text-[#f3e5ab]/80 tracking-wider font-light mt-1.5">
              {product.tagline}
            </p>
          </div>

          {/* Deal Callout if Product is Eligible */}
          {isProductDealEligible && isProductDealEligible(product.id) && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-black/80 to-emerald-950/70 border border-emerald-500/50 flex items-center gap-3.5 shadow-lg animate-in fade-in">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-black flex items-center justify-center font-bold flex-shrink-0 shadow">
                <Gift className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-black uppercase tracking-wider">
                    {promotionalDeal?.badgeText || 'SPECIAL OFFER'}
                  </span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                    {promotionalDeal?.title || 'Promotional Deal'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200 mt-0.5 leading-relaxed">
                  Purchase this perfume to qualify towards free bottles calculated automatically at checkout!
                </p>
              </div>
            </div>
          )}

          {/* DYNAMIC LIVE PRICE DISPLAY (Responsive & Perfectly Aligned on All Screens) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#17161c] to-[#121216] border border-[#d4af37]/35 space-y-3 shadow-lg">
            {/* Top row: Bottle size label + Stock status indicator badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Bottle Size: <strong className="text-[#f3e5ab] font-bold">{currentVariant.size}</strong>
              </span>

              {/* Stock status indicator badge */}
              {currentVariant.stock > 10 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>In Stock ({currentVariant.stock})</span>
                </span>
              ) : currentVariant.stock > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Only {currentVariant.stock} Left!</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/40 whitespace-nowrap">
                  <span>Sold Out</span>
                </span>
              )}
            </div>

            {/* Bottom row: Large Price + Struck Discount + Savings Pill */}
            <div className="flex items-baseline gap-3 flex-wrap pt-1 border-t border-white/5">
              <span className="font-serif-luxury text-3xl font-bold gold-text-gradient whitespace-nowrap leading-none">
                Rs. {unitPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-sm sm:text-base text-gray-500 line-through whitespace-nowrap">
                  Rs. {currentVariant.price.toLocaleString()}
                </span>
              )}
              {hasDiscount && (
                <span className="text-xs text-emerald-400 font-semibold px-2.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 whitespace-nowrap">
                  Save Rs. {(currentVariant.price - currentVariant.discountPrice).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* CREATIVE VARIANT SELECTOR (5ml, 10ml, 20ml, 50ml, 100ml) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs tracking-wider uppercase">
              <span className="font-semibold text-gray-200">Select Bottle Size & Volume:</span>
              <span className="text-[#d4af37]">Dynamic Sri Lankan Pricing</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {variants.map((v, idx) => {
                const isSelected = selectedVariantIndex === idx;
                const vPrice = v.discountPrice || v.price;
                return (
                  <button
                    key={v.id || idx}
                    type="button"
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#d4af37] bg-[#1d1b15] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#d4af37]'
                        : 'border-white/10 bg-[#101015] hover:border-[#d4af37]/50 hover:bg-[#14141a]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-[#f3e5ab]' : 'text-gray-300'}`}>
                          {v.size}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#d4af37]" />}
                      </div>
                      <div className="mt-2 text-sm font-bold text-white">
                        Rs. {vPrice.toLocaleString()}
                      </div>
                    </div>
                    {v.discountPrice && (
                      <span className="text-[10px] text-rose-400 mt-1">
                        Sale: save Rs. {(v.price - v.discountPrice).toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-sm text-gray-300 leading-relaxed font-light">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">The Olfactory Narrative:</h3>
            <p>{product.description}</p>
          </div>

          {/* Fragrance Pyramid Notes */}
          {product.notes && (
            <div className="p-5 rounded-2xl bg-[#111116] border border-[#d4af37]/20 space-y-4">
              <h3 className="text-xs font-serif-luxury font-bold uppercase tracking-widest text-[#f3e5ab] flex items-center gap-2">
                <span>Olfactory Pyramid Structure</span>
                <span className="h-px flex-1 bg-[#d4af37]/20" />
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Top */}
                <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-[#d4af37] font-semibold block">
                    Top Notes
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(product.notes.top || []).map((n, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#1e1e28] text-gray-200 text-[11px]">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Heart */}
                <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-[#d4af37] font-semibold block">
                    Heart Notes
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(product.notes.heart || []).map((n, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#1e1e28] text-gray-200 text-[11px]">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Base */}
                <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-[#d4af37] font-semibold block">
                    Base Notes
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(product.notes.base || []).map((n, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#1e1e28] text-gray-200 text-[11px]">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons: Responsive for all mobile screens and desktop */}
          <div className="pt-2 space-y-3">
            {/* Top row: Quantity Stepper + Add To Bag */}
            <div className="flex items-stretch gap-2.5 sm:gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center justify-between border border-[#d4af37]/35 rounded-xl bg-[#121216] px-2.5 py-2 w-28 sm:w-32 flex-shrink-0 shadow-inner">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-base font-bold cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="text-sm font-bold text-white font-mono">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(currentVariant.stock, quantity + 1))}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-base font-bold cursor-pointer"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add To Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={currentVariant.stock <= 0}
                className="flex-1 py-3 px-4 rounded-xl border border-[#d4af37] bg-[#181822] text-[#f3e5ab] hover:bg-[#d4af37]/15 active:scale-98 font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                <span>Add To Bag</span>
              </button>
            </div>

            {/* Bottom row: Instant Bank Transfer Order (Full Width & Ergonomic) */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={currentVariant.stock <= 0}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 active:scale-98 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>Instant Bank Transfer Order</span>
            </button>

            {/* Direct WhatsApp Ordering Assistance */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Inquire / Order Directly via WhatsApp (0763151311)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
