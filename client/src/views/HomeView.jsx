import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Truck, Droplets, Flame, Award, ChevronRight, Star, CheckCircle2, Check, MessageSquare, Plus, Camera, Heart, Tag, Percent, Gift } from 'lucide-react';
import HeroPerfumeVideo from '../components/HeroPerfumeVideo';
import AddReviewModal from '../components/AddReviewModal';
import { useFavourites } from '../context/FavouritesContext';

export default function HomeView({ onExploreShop, onSelectProduct, onOpenBankDetails, onNavigateReviews }) {
  const { toggleFavourite, isFavourite } = useFavourites();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [offerProducts, setOfferProducts] = useState([]);
  const [dealProducts, setDealProducts] = useState([]);
  const [promotionalDeal, setPromotionalDeal] = useState(() => {
    try {
      const cached = localStorage.getItem('scentory_settings');
      if (cached) {
        const s = JSON.parse(cached);
        return s.promotionalDeal || null;
      }
    } catch (e) {}
    return null;
  });

  const isProductDealEligible = (productId) => {
    if (!promotionalDeal || !promotionalDeal.enabled) return false;
    if (promotionalDeal.appliesTo === 'all' || !promotionalDeal.appliesTo) return true;
    const applicable = Array.isArray(promotionalDeal.applicableProductIds) ? promotionalDeal.applicableProductIds.map(String) : [];
    return applicable.includes(String(productId));
  };
  const [homeReviews, setHomeReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heroSettings, setHeroSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('scentory_settings');
      if (cached) {
        const s = JSON.parse(cached);
        return {
          heroBadge: s.heroBadge || "WE'RE LIVE • SCENTORY.LK",
          heroTitle: s.heroTitle || "A New Destination For Your",
          heroSubtitle: s.heroSubtitle || "Signature Scent.",
          heroDescription: s.heroDescription || "Discover artisan extrait de parfum, opulent royal ouds, and custom-decanted atomizers (10ml, 20ml, 50ml, 100ml). Curated exclusively for Sri Lanka’s fragrance lovers with verified bank transfer ordering."
        };
      }
    } catch (e) {}
    return {
      heroBadge: "WE'RE LIVE • SCENTORY.LK",
      heroTitle: "A New Destination For Your",
      heroSubtitle: "Signature Scent.",
      heroDescription: "Discover artisan extrait de parfum, opulent royal ouds, and custom-decanted atomizers (10ml, 20ml, 50ml, 100ml). Curated exclusively for Sri Lanka’s fragrance lovers with verified bank transfer ordering."
    };
  });

  // Real-time synchronization across admin updates & tabs
  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      const s = e.detail;
      if (s) {
        setHeroSettings(prev => ({
          heroBadge: s.heroBadge || prev.heroBadge,
          heroTitle: s.heroTitle || prev.heroTitle,
          heroSubtitle: s.heroSubtitle || prev.heroSubtitle,
          heroDescription: s.heroDescription || prev.heroDescription
        }));
      }
    };
    window.addEventListener('scentory-settings-updated', handleSettingsUpdate);

    let channel = null;
    try {
      channel = new BroadcastChannel('scentory_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SETTINGS_UPDATED' && event.data.settings) {
          const s = event.data.settings;
          setHeroSettings(prev => ({
            heroBadge: s.heroBadge || prev.heroBadge,
            heroTitle: s.heroTitle || prev.heroTitle,
            heroSubtitle: s.heroSubtitle || prev.heroSubtitle,
            heroDescription: s.heroDescription || prev.heroDescription
          }));
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('scentory-settings-updated', handleSettingsUpdate);
      if (channel) channel.close();
    };
  }, []);

  const loadData = () => {
    Promise.all([
      fetch('/api/products/featured').then(res => res.json()).catch(() => []),
      fetch('/api/products/trending').then(res => res.json()).catch(() => []),
      fetch('/api/products/offers').then(res => res.json()).catch(() => []),
      fetch('/api/products').then(res => res.json()).catch(() => []),
      fetch('/api/reviews').then(res => res.json()).catch(() => ({ reviews: [] })),
      fetch('/api/settings').then(res => res.json()).catch(() => null)
    ])
      .then(([featured, trending, offersData, allProducts, reviewsData, settingsData]) => {
        if (Array.isArray(featured)) setFeaturedProducts(featured);
        if (Array.isArray(trending)) setTrendingProducts(trending);

        if (settingsData && settingsData.promotionalDeal) {
          setPromotionalDeal(settingsData.promotionalDeal);
        }

        const activeDeal = settingsData?.promotionalDeal || promotionalDeal;

        // Populate dedicated deal products (Buy X Get Y Free)
        if (activeDeal && activeDeal.enabled && Array.isArray(allProducts)) {
          const eligible = allProducts.filter(p => {
            if (activeDeal.appliesTo === 'specific') {
              const applicable = Array.isArray(activeDeal.applicableProductIds) ? activeDeal.applicableProductIds.map(String) : [];
              return applicable.includes(String(p.id));
            }
            return true; // storewide
          });
          setDealProducts(eligible);
        } else {
          setDealProducts([]);
        }

        // Populate offer products strictly matching:
        // 1. Explicitly enabled isSpecialOffer === true
        // 2. Has discounted variant pricing lower than regular price
        let discounted = [];
        if (Array.isArray(offersData) && offersData.length > 0) {
          discounted = offersData.filter(p => p.isSpecialOffer === true && Array.isArray(p.variants) && p.variants.some(v => v.discountPrice && Number(v.discountPrice) < Number(v.price)));
        } else if (Array.isArray(allProducts) && allProducts.length > 0) {
          discounted = allProducts.filter(p => p.isSpecialOffer === true && Array.isArray(p.variants) && p.variants.some(v => v.discountPrice && Number(v.discountPrice) < Number(v.price)));
        }
        setOfferProducts(discounted);

        if (reviewsData && reviewsData.reviews) {
          // Exactly 5 reviews on Home page as explicitly requested by user
          setHomeReviews(reviewsData.reviews.slice(0, 5));
          setAverageRating(reviewsData.averageRating || 5.0);
          setTotalReviews(reviewsData.total || 0);
        }
        if (settingsData) {
          try { localStorage.setItem('scentory_settings', JSON.stringify(settingsData)); } catch (e) {}
          setHeroSettings(prev => ({
            heroBadge: settingsData.heroBadge || prev.heroBadge,
            heroTitle: settingsData.heroTitle || prev.heroTitle,
            heroSubtitle: settingsData.heroSubtitle || prev.heroSubtitle,
            heroDescription: settingsData.heroDescription || prev.heroDescription
          }));
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
                <span className="truncate">{heroSettings.heroBadge}</span>
              </div>

              <h1 className="font-serif-luxury text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight sm:leading-[1.1] tracking-wide break-words">
                {heroSettings.heroTitle}{' '}
                <span className="gold-text-gradient block mt-1">{heroSettings.heroSubtitle}</span>
              </h1>

              <p className="text-xs sm:text-base text-gray-300 font-light max-w-xl mx-auto lg:mx-0 leading-relaxed whitespace-pre-line">
                {heroSettings.heroDescription}
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

      {/* 1. DEDICATED DIVIDED SECTION: BUY X GET Y FREE PROMOTIONAL DEALS (UNDER HERO, ABOVE EXCLUSIVE OFFERS) */}
      {promotionalDeal?.enabled && (
        <section id="promotional-deals-section" className="py-12 sm:py-16 bg-gradient-to-b from-[#09150e] via-[#0d1419] to-[#0c0c11] border-b border-emerald-500/25 relative overflow-hidden">
          {/* Emerald & Gold Ambient Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#d4af37]/8 rounded-full blur-[130px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-semibold mb-2.5 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Gift className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span>{promotionalDeal.badgeText || 'SPECIAL PROMOTION'}</span>
                </div>
                <h2 className="font-serif-luxury text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-wide flex flex-wrap items-center gap-3">
                  <span>{promotionalDeal.title}</span>
                  <span className="text-[10px] sm:text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-[#d4af37] text-black uppercase tracking-wider shadow">
                    Auto-Applied in Cart
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-1.5 max-w-2xl font-light leading-relaxed">
                  {promotionalDeal.bannerText}
                </p>
              </div>

              <button
                onClick={() => onExploreShop({ filter: 'deals' })}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-lg cursor-pointer flex-shrink-0"
              >
                <span>Shop Fragrances</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Client Promotional Deal Poster Showcase Card */}
            <div className="glass-panel rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl bg-gradient-to-br from-[#0b1410] via-[#0d1214] to-[#121118]">
              {promotionalDeal.imageUrl ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-4 sm:p-8">
                  {/* Poster Image */}
                  <div className="lg:col-span-7 overflow-hidden rounded-2xl border border-[#d4af37]/30 shadow-2xl relative group bg-black/40 flex items-center justify-center">
                    <img
                      src={promotionalDeal.imageUrl}
                      alt={promotionalDeal.title || 'Promotional Offer'}
                      className="w-full max-h-[460px] object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/50 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                        <Gift className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{promotionalDeal.badgeText || 'SPECIAL OFFER'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Content / CTA */}
                  <div className="lg:col-span-5 space-y-5 p-2 sm:p-4 flex flex-col justify-center">
                    <div>
                      <span className="text-[10px] sm:text-xs text-[#d4af37] uppercase tracking-[0.2em] font-semibold block mb-1">
                        LIMITED TIME LUXURY DEAL
                      </span>
                      <h3 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-white leading-tight">
                        {promotionalDeal.title || 'Exclusive Fragrance Promotion'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300 mt-2 font-light leading-relaxed">
                        {promotionalDeal.bannerText}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-gray-200">
                        <Sparkles className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                        <span>Exclusive promotional luxury pricing across our artisan collection</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-gray-200">
                        <Gift className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Complimentary promotional savings auto-applied at checkout</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-gray-200">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>100% authentic extrait de parfum atomizers & flacons</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onExploreShop({ filter: 'deals' })}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:scale-[1.02] cursor-pointer"
                    >
                      <span>Shop Fragrances & Claim Deal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Showcase when image is not yet uploaded */
                <div className="p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4af37]/20 to-emerald-500/20 border border-[#d4af37]/40 flex items-center justify-center mx-auto text-[#d4af37] shadow-lg">
                    <Gift className="w-8 h-8 text-emerald-400 animate-pulse" />
                  </div>
                  <h3 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-white">
                    {promotionalDeal.title || 'Storewide Fragrance Promotion'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto font-light leading-relaxed">
                    {promotionalDeal.bannerText}
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => onExploreShop({ filter: 'deals' })}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all shadow-lg cursor-pointer"
                    >
                      <span>Shop Fragrances Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2. EXCLUSIVE FRAGRANCE PROMOTIONS (SPECIAL OFFERS & VARIANT DISCOUNTS) */}
      {offerProducts.length > 0 && (
        <section id="special-offers-section" className="py-14 sm:py-20 bg-gradient-to-b from-[#120f0a]/90 via-[#0d0d14] to-[#0c0c11] border-b border-[#d4af37]/25 relative overflow-hidden">
          {/* Golden ambient backdrops */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#d4af37]/8 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-semibold mb-3 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                  <Tag className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>Special Offers & Variant Discounts</span>
                </div>
                <h2 className="font-serif-luxury text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-wide">
                  Exclusive Fragrance <span className="gold-text-gradient">Promotions</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-xl font-light">
                  Limited-time discounted prices on luxury extrait de parfum atomizers and flacons. Handcrafted savings on our most distinguished scents.
                </p>
              </div>

              <button
                onClick={onExploreShop}
                className="mt-4 md:mt-0 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#f3e5ab] hover:text-white group cursor-pointer"
              >
                <span>Explore All Offers</span>
                <ChevronRight className="w-4 h-4 text-[#d4af37] transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div id="special-offers-grid" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 scroll-mt-24">
              {offerProducts.map((product) => {
                const discountedVariants = (product.variants || []).filter(v => v.discountPrice && Number(v.discountPrice) < Number(v.price));
                const lowestDiscountedPrice = Math.min(...(product.variants || []).map(v => v.discountPrice || v.price));
                const lowestVariant = (product.variants || []).find(v => (v.discountPrice || v.price) === lowestDiscountedPrice);
                const originalPrice = lowestVariant ? lowestVariant.price : lowestDiscountedPrice;
                const savings = originalPrice > lowestDiscountedPrice ? originalPrice - lowestDiscountedPrice : 0;
                const discountPct = originalPrice > lowestDiscountedPrice ? Math.round(((originalPrice - lowestDiscountedPrice) / originalPrice) * 100) : 0;
                const isFav = isFavourite(product.id);
                const isDeal = isProductDealEligible(product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => onSelectProduct(product)}
                    className="group glass-panel rounded-2xl overflow-hidden border border-rose-500/30 hover:border-[#d4af37] transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1.5 shadow-xl bg-[#0e0c12] relative"
                  >
                    {/* Top Discount Badge Banner */}
                    <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start">
                      {discountPct > 0 ? (
                        <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase shadow-lg flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{discountPct}% OFF</span>
                        </div>
                      ) : isDeal ? (
                        <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase shadow-lg flex items-center gap-1">
                          <Gift className="w-2.5 h-2.5" />
                          <span>{promotionalDeal?.badgeText || 'SPECIAL DEAL'}</span>
                        </div>
                      ) : (
                        <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase shadow-lg flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          <span>EXCLUSIVE OFFER</span>
                        </div>
                      )}

                      {savings > 0 ? (
                        <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-[#d4af37]/40 text-[#f3e5ab] text-[8px] sm:text-[9px] font-mono font-semibold">
                          Save Rs. {savings.toLocaleString()}
                        </div>
                      ) : isDeal ? (
                        <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[8px] sm:text-[9px] font-mono font-semibold">
                          {promotionalDeal?.title || 'Free Bottle Deal'}
                        </div>
                      ) : null}
                    </div>

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
                        className="absolute top-2.5 right-2.5 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-md cursor-pointer"
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white/80 hover:text-rose-400'}`} />
                      </button>

                      {/* Overlay: Price preview */}
                      <div className="absolute bottom-2 inset-x-2 p-1.5 sm:p-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[8px] sm:text-[9px] text-gray-400 block uppercase leading-none">Deal From</span>
                          <span className="font-serif-luxury text-xs sm:text-sm font-bold text-rose-300 whitespace-nowrap">
                            Rs. {lowestDiscountedPrice.toLocaleString()}
                          </span>
                        </div>
                        {originalPrice > lowestDiscountedPrice && (
                          <span className="text-[9px] sm:text-xs text-gray-400 line-through whitespace-nowrap font-mono">
                            Rs. {originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] sm:text-[10px] text-[#d4af37] uppercase tracking-wider block mb-0.5 truncate font-medium">
                          {product.scentFamily} • {product.gender}
                        </span>
                        <h3 className="font-serif-luxury text-xs sm:text-base font-bold text-white group-hover:text-[#d4af37] transition-colors line-clamp-1 leading-tight">
                          {product.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-1 hidden xs:block font-light">
                          {product.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] text-gray-400">
                          {discountedVariants.length > 0
                            ? `${discountedVariants.length} discounted ${discountedVariants.length === 1 ? 'size' : 'sizes'}`
                            : (isDeal ? (promotionalDeal?.badgeText || 'Deal Qualifying') : `${(product.variants || []).length} available sizes`)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#f3e5ab] group-hover:translate-x-0.5 transition-transform">
                          <span>Claim Deal</span>
                          <ArrowRight className="w-3 h-3 text-[#d4af37]" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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

        {featuredProducts.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-[#d4af37]/25 text-center space-y-3 max-w-lg mx-auto">
            <Sparkles className="w-8 h-8 text-[#d4af37] mx-auto opacity-70 animate-pulse" />
            <h3 className="font-serif-luxury text-xl font-bold text-white">New Collection Launching Soon</h3>
            <p className="text-xs text-gray-400">Our artisan flacons and custom decants are currently being prepared. Check back shortly or browse our full fragrance catalogue.</p>
            <button
              onClick={onExploreShop}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3e5ab] text-xs uppercase tracking-wider hover:bg-[#d4af37] hover:text-black transition-all cursor-pointer"
            >
              Explore Shop
            </button>
          </div>
        ) : (
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

                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {isProductDealEligible(product.id) && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 font-bold text-[9px] sm:text-xs uppercase tracking-wider shadow-lg flex items-center gap-1 w-fit">
                          <Gift className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span>{promotionalDeal.badgeText || 'SPECIAL DEAL'}</span>
                        </span>
                      )}
                      <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-[9px] sm:text-xs uppercase tracking-wider shadow-lg w-fit">
                        {product.badge || 'Signature'}
                      </div>
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
        )}
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
