import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Truck, Droplets, Flame, Award, ChevronRight, Star, CheckCircle2, MessageSquare, Plus, Camera, Heart } from 'lucide-react';
import HeroPerfumeVideo from '../components/HeroPerfumeVideo';
import AddReviewModal from '../components/AddReviewModal';
import { useFavourites } from '../context/FavouritesContext';

export default function HomeView({ onExploreShop, onSelectProduct, onOpenBankDetails, onNavigateReviews }) {
  const { toggleFavourite, isFavourite } = useFavourites();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [homeReviews, setHomeReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      fetch('/api/products/featured').then(res => res.json()),
      fetch('/api/products/trending').then(res => res.json()),
      fetch('/api/reviews').then(res => res.json())
    ])
      .then(([featured, trending, reviewsData]) => {
        if (Array.isArray(featured)) setFeaturedProducts(featured);
        if (Array.isArray(trending)) setTrendingProducts(trending);
        if (reviewsData && reviewsData.reviews) {
          // Exactly 5 reviews on Home page as explicitly requested by user
          setHomeReviews(reviewsData.reviews.slice(0, 5));
          setAverageRating(reviewsData.averageRating || 5.0);
          setTotalReviews(reviewsData.total || 0);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* HERO SECTION WITH CLIENT'S LUXURY ANIMATED COMMERCIAL VIDEO */}
      <section className="relative min-h-[85vh] flex items-center justify-center py-8 sm:py-12 lg:py-16 border-b border-[#d4af37]/20 overflow-hidden w-full max-w-full">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] h-[300px] sm:h-[500px] bg-[#d4af37]/10 rounded-full blur-[90px] sm:blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Hero Narrative */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left z-10 w-full max-w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-[#d4af37]/40 bg-[#141208]/90 text-[#f3e5ab] text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.25em] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse flex-shrink-0" />
                <span className="truncate">WE'RE LIVE • SCENTORY.LK</span>
              </div>

              <h1 className="font-serif-luxury text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight sm:leading-[1.1] tracking-wide break-words">
                A New Destination For Your{' '}
                <span className="gold-text-gradient block mt-1">Signature Scent.</span>
              </h1>

              <p className="text-xs sm:text-base text-gray-300 font-light max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Discover artisan extrait de parfum, opulent royal ouds, and custom-decanted atomizers (10ml, 20ml, 50ml, 100ml). Curated exclusively for Sri Lanka’s fragrance lovers with verified bank transfer ordering.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2 w-full max-w-md mx-auto lg:mx-0">
                <button
                  onClick={onExploreShop}
                  className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-full bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:opacity-95 transition-all shadow-[0_0_25px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Explore Fragrances</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={onOpenBankDetails}
                  className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-full border border-[#d4af37]/40 text-[#f3e5ab] hover:border-[#d4af37] hover:bg-[#d4af37]/10 font-semibold text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all text-center cursor-pointer"
                >
                  Bank Transfer Details
                </button>
              </div>

              {/* Trust Value Badges */}
              <div className="pt-6 border-t border-[#d4af37]/15 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="font-serif-luxury text-lg sm:text-xl font-bold gold-text-gradient">100%</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Authentic Extrait</div>
                </div>
                <div>
                  <div className="font-serif-luxury text-lg sm:text-xl font-bold gold-text-gradient">10ml — 100ml</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Custom Decants</div>
                </div>
                <div>
                  <div className="font-serif-luxury text-lg sm:text-xl font-bold gold-text-gradient">Islandwide</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Verified Courier</div>
                </div>
              </div>
            </div>

            {/* Right: CLIENT CINEMATIC LUXURY ANIMATED PERFUME VIDEO */}
            <div id="hero-perfume-video-container" className="lg:col-span-5 relative z-10 flex items-center justify-center scroll-mt-24">
              <HeroPerfumeVideo />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED MASTERPIECES SECTION */}
      <section id="featured-section" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#d4af37] font-semibold mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Curated Selection</span>
            </div>
            <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-wide">
              Featured Fragrances
            </h2>
          </div>
          <button
            onClick={onExploreShop}
            className="mt-4 md:mt-0 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#f3e5ab] hover:text-white group cursor-pointer"
          >
            <span>View All Fragrances</span>
            <ChevronRight className="w-4 h-4 text-[#d4af37] transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-8">
          {featuredProducts.slice(0, 4).map((product) => {
            const lowestPrice = Math.min(...(product.variants || []).map(v => v.discountPrice || v.price));
            const isFav = isFavourite(product.id);

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="group glass-panel rounded-2xl overflow-hidden border border-[#d4af37]/20 hover:border-[#d4af37] transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1.5 shadow-xl bg-[#0d0d14]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-black/60">
                  <img
                    src={product.images?.[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                  />

                  {/* Favourite Heart Action Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(product.id);
                    }}
                    title={isFav ? "Remove from favourites" : "Add to favourites"}
                    aria-label="Toggle favourite"
                    className="absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-md cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white/80 hover:text-rose-400'}`} />
                  </button>

                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-[9px] sm:text-xs uppercase tracking-wider shadow-lg">
                    {product.badge || 'Signature'}
                  </div>

                  {/* Price overlay on bottom of image for mobile */}
                  <div className="absolute bottom-2 inset-x-2 p-1.5 sm:p-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 block uppercase leading-none">From</span>
                      <span className="font-serif-luxury text-xs sm:text-sm font-bold gold-text-gradient whitespace-nowrap">
                        Rs. {lowestPrice.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-[#f3e5ab] uppercase tracking-wider border border-[#d4af37]/30 px-1.5 py-0.5 rounded font-mono">
                      {(product.variants || []).length} Sizes
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-5">
                  <span className="text-[9px] sm:text-[11px] text-[#d4af37] uppercase tracking-wider block mb-0.5 line-clamp-1">
                    {product.scentFamily} • {product.gender}
                  </span>
                  <h3 className="font-serif-luxury text-xs sm:text-lg font-bold text-white group-hover:text-[#d4af37] transition-colors line-clamp-1 leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-1 sm:line-clamp-2 hidden xs:block font-light">
                    {product.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AUTOMATICALLY CALCULATED TRENDING PRODUCTS SECTION */}
      <section className="py-16 bg-[#0c0c11] border-y border-[#d4af37]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181824] border border-[#d4af37]/30 text-xs text-[#f3e5ab] uppercase tracking-widest mb-3">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
              <span>Calculated Live From Customer Orders</span>
            </div>
            <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-wide">
              Trending & Best Sellers
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              The highest-demanded fragrances ordered by perfume enthusiasts across Sri Lanka this month.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
            {trendingProducts.map((product) => {
              const lowestPrice = Math.min(...(product.variants || []).map(v => v.discountPrice || v.price));
              const isFav = isFavourite(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden border border-[#d4af37]/20 hover:border-[#d4af37]/60 transition-all cursor-pointer p-2.5 sm:p-4 group hover:-translate-y-1 shadow-lg flex flex-col justify-between bg-[#0d0d14]"
                >
                  <div className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden mb-2 bg-black/40">
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Favourite Heart Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(product.id);
                      }}
                      title={isFav ? "Remove from favourites" : "Add to favourites"}
                      aria-label="Toggle favourite"
                      className="absolute top-1.5 right-1.5 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-md cursor-pointer"
                    >
                      <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white/80 hover:text-rose-400'}`} />
                    </button>

                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold bg-amber-500 text-black uppercase">
                      {product.salesCount || 10}+ Orders
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] sm:text-[10px] text-gray-400 block truncate">{product.scentFamily}</span>
                    <h4 className="font-serif-luxury text-xs sm:text-sm font-semibold text-white line-clamp-1 leading-tight">
                      {product.name}
                    </h4>
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-[#f3e5ab] whitespace-nowrap">
                      Rs. {lowestPrice.toLocaleString()}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#d4af37] underline whitespace-nowrap">Sizes</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW TO ORDER VIA BANK TRANSFER IN SRI LANKA */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#d4af37]/15">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.25em] text-[#d4af37] font-semibold block mb-2">
            Seamless Ordering Process
          </span>
          <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-wide">
            How To Order In Sri Lanka
          </h2>
          <p className="text-xs text-gray-400 mt-2">
            Follow our verified bank transfer checkout flow for immediate packaging and islandwide dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/20 relative">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37] text-black font-bold text-sm flex items-center justify-center mb-4">
              01
            </div>
            <h3 className="font-serif-luxury text-base font-bold text-white mb-2">
              Select ML Variant
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Choose from 10ml travel decants, 20ml luxury flacons, or 50ml/100ml bottles with dynamic instant prices.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/20 relative">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37] text-black font-bold text-sm flex items-center justify-center mb-4">
              02
            </div>
            <h3 className="font-serif-luxury text-base font-bold text-white mb-2">
              Login & WhatsApp Info
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Securely sign in or register your customer account with your active WhatsApp number and delivery address.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/20 relative">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37] text-black font-bold text-sm flex items-center justify-center mb-4">
              03
            </div>
            <h3 className="font-serif-luxury text-base font-bold text-white mb-2">
              Bank Transfer & Slip
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Transfer to Commercial Bank and upload your payment slip receipt screenshot directly on checkout.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-[#d4af37]/20 relative">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37] text-black font-bold text-sm flex items-center justify-center mb-4">
              04
            </div>
            <h3 className="font-serif-luxury text-base font-bold text-white mb-2">
              Admin Verification & Delivery
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Our admin verifies the deposit slip against bank statements, after which your authentic parcel is dispatched islandwide.
            </p>
          </div>
        </div>
      </section>

      {/* TOP 5 VERIFIED CUSTOMER REVIEWS & RATINGS SECTION ON HOME PAGE */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181824] border border-[#d4af37]/35 text-xs text-[#f3e5ab] uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Verified Customer Impressions</span>
          </div>
          <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-wide">
            Loved By Sri Lanka's Scent Connoisseurs
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex text-[#d4af37]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#d4af37]" />
              ))}
            </div>
            <span className="text-xs text-gray-300 font-semibold font-mono">
              {averageRating} / 5.0 ({totalReviews}+ Reviews)
            </span>
          </div>
        </div>

        {/* The 5 Featured Customer Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {homeReviews.map((rev) => (
            <div
              key={rev.id}
              className="glass-panel p-6 rounded-2xl border border-[#d4af37]/25 hover:border-[#d4af37]/60 transition-all shadow-xl flex flex-col justify-between space-y-4 hover:-translate-y-1"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (rev.rating || 5)
                            ? 'text-[#d4af37] fill-[#d4af37]'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Order</span>
                  </span>
                </div>

                <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#161622] text-[#f3e5ab] text-[11px] font-medium border border-[#d4af37]/20">
                  {rev.productName}
                </div>

                <p className="text-xs text-gray-200 leading-relaxed font-light">
                  "{rev.comment}"
                </p>

                {rev.image && (
                  <div
                    onClick={() => setPreviewPhoto(rev.image)}
                    className="relative w-24 h-16 rounded-xl overflow-hidden border border-[#d4af37]/30 cursor-pointer group mt-2"
                  >
                    <img src={rev.image} alt="Customer Bottle" className="w-full h-full object-cover group-hover:scale-108 transition-transform" />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-white opacity-80" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                <div>
                  <span className="font-semibold text-white block">{rev.customerName}</span>
                  <span className="text-[10px] text-[#c5a059]">{rev.location || 'Sri Lanka'}</span>
                </div>
                <span className="text-[10px] text-gray-500">
                  {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ACTIONS UNDER THE 5 REVIEWS: ADD RATING & VIEW ALL REVIEWS */}
        <div className="p-8 rounded-3xl glass-panel border border-[#d4af37]/35 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl bg-gradient-to-r from-[#14120c] via-[#101016] to-[#14120c]">
          <div>
            <h3 className="font-serif-luxury text-lg font-bold text-white">
              Have You Experienced Our Fragrances?
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Add your rating, upload your bottle photo, and share your thoughts with fellow perfume enthusiasts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Add Rating / Review Button */}
            <button
              onClick={() => setIsAddReviewOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your Rating & Review</span>
            </button>

            {/* View All Reviews Button */}
            <button
              onClick={onNavigateReviews}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-[#d4af37]/50 text-[#f3e5ab] hover:bg-[#d4af37]/15 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4 text-[#d4af37]" />
              <span>View All Customer Reviews ({totalReviews})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Photo Lightbox */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl w-full max-h-[85vh] p-2 glass-panel rounded-2xl border border-[#d4af37]/40 shadow-2xl">
            <img src={previewPhoto} alt="Customer Photo" className="w-full h-auto max-h-[80vh] object-contain rounded-xl mx-auto" />
            <p className="text-center text-xs text-gray-400 mt-2">Click anywhere to close photo</p>
          </div>
        </div>
      )}

      {/* Add Review Modal */}
      <AddReviewModal
        isOpen={isAddReviewOpen}
        onClose={() => setIsAddReviewOpen(false)}
        onReviewAdded={() => {
          loadData();
        }}
      />
    </div>
  );
}
