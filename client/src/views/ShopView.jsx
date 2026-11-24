import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Sparkles, Eye, ShoppingBag, Check, Zap, Tag, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../context/FavouritesContext';

export default function ShopView({ onSelectProduct, onQuickOrder }) {
  const { addToCart } = useCart();
  const { toggleFavourite, isFavourite } = useFavourites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopSettings, setShopSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('scentory_settings');
      if (cached) {
        const s = JSON.parse(cached);
        return {
          shopBadge: s.shopBadge || 'Exclusive Fragrance Collection',
          shopTitle: s.shopTitle || 'Distinguished Scents For Every Occasion',
          shopDescription: s.shopDescription || 'Available in precision travel decants (10ml, 30ml) and full flacons (50ml, 100ml). All prices in Sri Lankan Rupees (LKR).'
        };
      }
    } catch (e) {}
    return {
      shopBadge: 'Exclusive Fragrance Collection',
      shopTitle: 'Distinguished Scents For Every Occasion',
      shopDescription: 'Available in precision travel decants (10ml, 30ml) and full flacons (50ml, 100ml). All prices in Sri Lankan Rupees (LKR).'
    };
  });

  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      const s = e.detail;
      if (s) {
        setShopSettings(prev => ({
          shopBadge: s.shopBadge || prev.shopBadge,
          shopTitle: s.shopTitle || prev.shopTitle,
          shopDescription: s.shopDescription || prev.shopDescription
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
          setShopSettings(prev => ({
            shopBadge: s.shopBadge || prev.shopBadge,
            shopTitle: s.shopTitle || prev.shopTitle,
            shopDescription: s.shopDescription || prev.shopDescription
          }));
        }
      };
    } catch (e) {}

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          try { localStorage.setItem('scentory_settings', JSON.stringify(data)); } catch (e) {}
          setShopSettings(prev => ({
            shopBadge: data.shopBadge || prev.shopBadge,
            shopTitle: data.shopTitle || prev.shopTitle,
            shopDescription: data.shopDescription || prev.shopDescription
          }));
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('scentory-settings-updated', handleSettingsUpdate);
      if (channel) channel.close();
    };
  }, []);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [sortBy, setSortBy] = useState('trending'); // trending, price-low, price-high, newest

  useEffect(() => {
    // Listen for custom events triggered from Navbar
    const handleFeaturedFilter = () => {
      setOnlyFeatured(true);
      setSortBy('trending');
    };
    const handleTrendingFilter = () => {
      setSortBy('trending');
      setOnlyFeatured(false);
    };

    window.addEventListener('filter-featured', handleFeaturedFilter);
    window.addEventListener('filter-trending', handleTrendingFilter);

    return () => {
      window.removeEventListener('filter-featured', handleFeaturedFilter);
      window.removeEventListener('filter-trending', handleTrendingFilter);
    };
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    let url = `/api/products?sort=${sortBy}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (selectedGender !== 'all') url += `&gender=${selectedGender}`;
    if (onlyFeatured) url += `&featured=true`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        let list = Array.isArray(data) ? data : [];
        if (selectedFamily !== 'all') {
          list = list.filter(p => p.scentFamily && p.scentFamily.toLowerCase().includes(selectedFamily.toLowerCase()));
        }
        if (onlyDiscounted) {
          list = list.filter(p => (p.variants || []).some(v => v.discountPrice && v.discountPrice < v.price));
        }
        setProducts(list);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedGender, selectedFamily, onlyFeatured, onlyDiscounted, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-300">
      {/* Page Title & Subtitle */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="text-xs font-semibold tracking-[0.25em] text-[#d4af37] uppercase block mb-1">
          {shopSettings.shopBadge}
        </span>
        <h1 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-white tracking-wide">
          {shopSettings.shopTitle}
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 mt-2 font-light leading-relaxed">
          {shopSettings.shopDescription}
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-[#d4af37]/25 mb-8 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by scent name, notes (oud, amber, iris)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111116] border border-white/10 text-white text-xs focus:border-[#d4af37] outline-none transition-all placeholder:text-gray-500"
            />
          </div>

          {/* Gender Pills */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            {['all', 'unisex', 'men', 'women'].map((gender) => (
              <button
                key={gender}
                onClick={() => setSelectedGender(gender)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                  selectedGender === gender
                    ? 'bg-[#d4af37] text-black font-bold shadow-md'
                    : 'bg-[#14141c] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {gender === 'all' ? 'All Genders' : gender}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto">
            <span className="text-xs text-gray-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl bg-[#111116] border border-white/10 text-xs text-white focus:border-[#d4af37] outline-none"
            >
              <option value="trending">Trending & Best Sellers (Auto)</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest Additions</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
          <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mr-1">
            Filter By:
          </span>

          <button
            onClick={() => setOnlyFeatured(!onlyFeatured)}
            className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 ${
              onlyFeatured
                ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f3e5ab]'
                : 'border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#d4af37]" />
            <span>Featured Only</span>
          </button>

          <button
            onClick={() => setOnlyDiscounted(!onlyDiscounted)}
            className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 ${
              onlyDiscounted
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                : 'border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <Tag className="w-3 h-3 text-rose-400" />
            <span>Discounts & Offers</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Scent Family:</span>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#14141c] border border-white/10 text-xs text-gray-300 focus:border-[#d4af37] outline-none"
            >
              <option value="all">All Fragrance Families</option>
              <option value="Oriental">Oriental & Oud</option>
              <option value="Woody">Woody & Sandalwood</option>
              <option value="Floral">Floral & Jasmine</option>
              <option value="Fresh">Fresh & Aquatic</option>
              <option value="Gourmand">Gourmand & Tobacco</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">Loading fragrance catalogue...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl text-center border border-[#d4af37]/20 my-8">
          <p className="text-base text-gray-300 font-serif-luxury mb-2">No fragrances matched your filters</p>
          <p className="text-xs text-gray-400 mb-6">Try clearing your search query or reset filter options.</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedGender('all');
              setSelectedFamily('all');
              setOnlyFeatured(false);
              setOnlyDiscounted(false);
            }}
            className="px-6 py-2 rounded-full bg-[#d4af37] text-black font-semibold text-xs uppercase tracking-wider"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-6">
          {products.map((product) => {
            const variants = product.variants || [];
            const lowestPrice = variants.length > 0
              ? Math.min(...variants.map(v => v.discountPrice || v.price))
              : 2500;
            const originalLowestPrice = variants.length > 0
              ? variants.find(v => (v.discountPrice || v.price) === lowestPrice)?.price || lowestPrice
              : lowestPrice;
            const hasDiscount = originalLowestPrice > lowestPrice;
            const isFav = isFavourite(product.id);

            return (
              <div
                key={product.id}
                className="group glass-panel rounded-2xl overflow-hidden border border-[#d4af37]/20 hover:border-[#d4af37]/60 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 shadow-[0_10px_25px_rgba(0,0,0,0.5)] bg-[#0d0d14]"
              >
                {/* Image Container with Badges & Favourite Heart Button */}
                <div
                  onClick={() => onSelectProduct(product)}
                  className="relative aspect-[4/5] sm:aspect-[4/5] overflow-hidden bg-black/60 cursor-pointer"
                >
                  <img
                    src={product.images?.[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                    loading="lazy"
                  />

                  {/* Gradient Overlay for luxury feel */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-transparent to-black/30 opacity-70 group-hover:opacity-40 transition-opacity" />

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

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.badge && (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#d4af37] text-black shadow-lg">
                        {product.badge}
                      </span>
                    )}
                    {product.isFeatured && !product.badge && (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-black/80 border border-[#d4af37]/50 text-[#f3e5ab]">
                        Featured
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-900/90 border border-rose-500/50 text-rose-200 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider w-fit">
                        SALE
                      </span>
                    )}
                  </div>

                  {/* Quick View Button overlay on hover (desktop only) */}
                  <div className="hidden sm:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <span className="px-3 py-1.5 rounded-full bg-[#171720]/90 border border-[#d4af37] text-[#f3e5ab] text-[11px] font-semibold uppercase tracking-wider shadow-xl flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>View Sizes</span>
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
                  <div>
                    {/* Family & Gender tag */}
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#c5a059] uppercase tracking-wider mb-0.5">
                      <span className="truncate max-w-[65%]">{product.scentFamily}</span>
                      <span className="text-gray-400 capitalize truncate">{product.gender}</span>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => onSelectProduct(product)}
                      className="font-serif-luxury text-xs sm:text-base font-bold text-white hover:text-[#d4af37] cursor-pointer transition-colors line-clamp-1 leading-tight"
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1 mt-0.5 font-light hidden xs:block">
                      {product.tagline}
                    </p>
                  </div>

                  {/* Available Sizes Pills (Desktop & Tablet) */}
                  <div className="hidden sm:flex flex-wrap gap-1">
                    {variants.map((v, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-gray-300"
                      >
                        {v.size.split(' ')[0]}
                      </span>
                    ))}
                  </div>

                  {/* Price & Action */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-widest block leading-none mb-0.5">
                        Starts From
                      </span>
                      <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
                        <span className="font-serif-luxury text-xs sm:text-base font-bold gold-text-gradient whitespace-nowrap">
                          Rs. {lowestPrice.toLocaleString()}
                        </span>
                        {hasDiscount && (
                          <span className="text-[9px] sm:text-xs text-gray-500 line-through whitespace-nowrap">
                            Rs. {originalLowestPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectProduct(product)}
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[#1a1a24] hover:bg-[#d4af37] text-[#d4af37] hover:text-black transition-all border border-[#d4af37]/40 shadow-md group/btn flex-shrink-0 cursor-pointer"
                      title="Select Bottle Size"
                      aria-label="Select Bottle Size"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
}
