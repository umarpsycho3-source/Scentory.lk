import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { FavouritesProvider } from './context/FavouritesContext';
import Navbar from './components/Navbar';
import ScentParticles from './components/ScentParticles';
import BankDetailsModal from './components/BankDetailsModal';
import HomeView from './views/HomeView';
import ShopView from './views/ShopView';
import ProductDetailView from './views/ProductDetailView';
import CheckoutView from './views/CheckoutView';
import UserProfileView from './views/UserProfileView';
import ReviewsView from './views/ReviewsView';
import AdminView from './views/AdminView';
import CartModal from './views/CartModal';
import AuthModal from './views/AuthModal';
import FloatingSocials from './components/FloatingSocials';

function MainApp() {
  const { user, isAdmin } = useAuth();

  const resolveViewFromUrl = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin') || window.location.search.includes('admin') || window.location.hash.includes('admin')) {
      return { view: 'admin', productId: null };
    }
    if (path.startsWith('/shop')) {
      return { view: 'shop', productId: null };
    }
    if (path.startsWith('/reviews')) {
      return { view: 'reviews', productId: null };
    }
    if (path.startsWith('/product/')) {
      const parts = window.location.pathname.split('/');
      const id = parts[2] || null;
      return { view: 'product-detail', productId: id };
    }
    return { view: 'home', productId: null };
  };

  // URL-driven View Detection for storefront and admin
  const [currentView, setCurrentView] = useState(() => resolveViewFromUrl().view);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductLoading, setIsProductLoading] = useState(() => {
    const route = resolveViewFromUrl();
    return route.view === 'product-detail' && !!route.productId;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('orders');
  const [shopFilter, setShopFilter] = useState(null);

  const { toastMessage, setIsCartOpen } = useCart();

  // Load product if directly landing on a /product/:id URL
  useEffect(() => {
    const route = resolveViewFromUrl();
    if (route.view === 'product-detail' && route.productId) {
      setIsProductLoading(true);
      fetch(`/api/products/${route.productId}`)
        .then(res => res.json())
        .then(prod => {
          if (prod && prod.id) {
            setSelectedProduct(prod);
          }
        })
        .catch(() => {})
        .finally(() => setIsProductLoading(false));
    }
  }, []);

  // Listen to browser URL changes (e.g. typing /admin, /shop, /reviews or browser back/forward)
  useEffect(() => {
    const checkUrl = () => {
      const route = resolveViewFromUrl();
      setCurrentView(route.view);
      if (route.view === 'product-detail' && route.productId && (!selectedProduct || selectedProduct.id !== route.productId)) {
        setIsProductLoading(true);
        fetch(`/api/products/${route.productId}`)
          .then(res => res.json())
          .then(prod => {
            if (prod && prod.id) setSelectedProduct(prod);
          })
          .catch(() => {})
          .finally(() => setIsProductLoading(false));
      }
    };

    window.addEventListener('popstate', checkUrl);
    return () => window.removeEventListener('popstate', checkUrl);
  }, [selectedProduct]);

  // Dynamic SEO Meta & JSON-LD Structured Data Schema Manager
  useEffect(() => {
    const baseUrl = 'https://scentory-lk.vercel.app';
    let title = 'SCENTORY.LK | Luxury Perfumes & Signature Fragrance Decants in Sri Lanka';
    let description = 'Discover authentic designer & niche perfume decants in Sri Lanka. Handcrafted into sterile clinical glass atomizers in Ulapane and dispatched islandwide.';
    let canonical = `${baseUrl}/`;
    let ogImage = `${baseUrl}/brand-logo.png`;
    let jsonLdData = null;

    if (currentView === 'shop') {
      title = 'All Fragrances & Decants Collection | SCENTORY.LK Sri Lanka';
      description = 'Browse our full collection of luxury extrait de parfum atomizers and flacons. 10ml, 30ml, 50ml, and 100ml authentic perfume decants in Sri Lanka.';
      canonical = `${baseUrl}/shop`;
      jsonLdData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            '@id': `${baseUrl}/shop#collection`,
            'url': `${baseUrl}/shop`,
            'name': title,
            'description': description
          },
          {
            '@type': 'BreadcrumbList',
            '@id': `${baseUrl}/shop#breadcrumb`,
            'itemListElement': [
              { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${baseUrl}/` },
              { '@type': 'ListItem', 'position': 2, 'name': 'All Fragrances', 'item': `${baseUrl}/shop` }
            ]
          }
        ]
      };
    } else if (currentView === 'reviews') {
      title = 'Customer Reviews & Fragrance Ratings | SCENTORY.LK Sri Lanka';
      description = 'Read verified customer reviews and ratings for authentic fragrance decants from SCENTORY.LK. Trusted perfume atomizers across Sri Lanka.';
      canonical = `${baseUrl}/reviews`;
      jsonLdData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemPage',
            '@id': `${baseUrl}/reviews#page`,
            'url': `${baseUrl}/reviews`,
            'name': title,
            'description': description
          },
          {
            '@type': 'BreadcrumbList',
            '@id': `${baseUrl}/reviews#breadcrumb`,
            'itemListElement': [
              { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${baseUrl}/` },
              { '@type': 'ListItem', 'position': 2, 'name': 'Customer Reviews', 'item': `${baseUrl}/reviews` }
            ]
          }
        ]
      };
    } else if (currentView === 'product-detail') {
      if (!selectedProduct) {
        // Keep the prerendered Product JSON-LD intact in the HTML; do not overwrite while fetching
        return;
      }

      title = `${selectedProduct.name} | Luxury Extrait De Parfum | SCENTORY.LK`;
      const family = selectedProduct.scentFamily ? ` (${selectedProduct.scentFamily})` : '';
      description = selectedProduct.description
        ? `${selectedProduct.description.slice(0, 150)}... Authentic perfume decants in Sri Lanka.`
        : `Buy authentic ${selectedProduct.name}${family} luxury extrait de parfum decant in Sri Lanka. 100% genuine with islandwide delivery.`;
      canonical = `${baseUrl}/product/${selectedProduct.id}`;
      const productImageUrl = `${baseUrl}/uploads/products/${selectedProduct.id}.jpg`;
      ogImage = productImageUrl;

      const variants = Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0
        ? selectedProduct.variants
        : [{ price: 3500 }];
      const prices = variants.map(v => Number(v.discountPrice || v.price) || 0).filter(p => p > 0);
      const minPrice = prices.length ? Math.min(...prices) : 3500;
      const maxPrice = prices.length ? Math.max(...prices) : 3500;

      jsonLdData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Product',
            '@id': `${baseUrl}/product/${selectedProduct.id}#product`,
            'name': selectedProduct.name,
            'image': [productImageUrl],
            'description': description,
            'sku': selectedProduct.id,
            'brand': {
              '@type': 'Brand',
              'name': 'SCENTORY.LK'
            },
            'offers': {
              '@type': 'AggregateOffer',
              'priceCurrency': 'LKR',
              'lowPrice': minPrice,
              'highPrice': maxPrice,
              'offerCount': variants.length,
              'price': minPrice,
              'priceValidUntil': '2027-12-31',
              'availability': 'https://schema.org/InStock',
              'url': `${baseUrl}/product/${selectedProduct.id}`,
              'seller': {
                '@type': 'Organization',
                'name': 'SCENTORY.LK'
              }
            }
          },
          {
            '@type': 'BreadcrumbList',
            '@id': `${baseUrl}/product/${selectedProduct.id}#breadcrumb`,
            'itemListElement': [
              { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${baseUrl}/` },
              { '@type': 'ListItem', 'position': 2, 'name': 'All Fragrances', 'item': `${baseUrl}/shop` },
              { '@type': 'ListItem', 'position': 3, 'name': selectedProduct.name, 'item': `${baseUrl}/product/${selectedProduct.id}` }
            ]
          },
          {
            '@type': 'OnlineStore',
            '@id': `${baseUrl}/#store`,
            'name': 'SCENTORY.LK',
            'url': `${baseUrl}/`,
            'logo': `${baseUrl}/brand-logo.png`,
            'image': `${baseUrl}/brand-logo.png`,
            'description': "Sri Lanka's dedicated house for authentic niche & designer perfume decants. Handcrafted into sterile clinical glass atomizers in Ulapane.",
            'telephone': '+94763151311',
            'priceRange': 'LKR 1,300 - LKR 25,000',
            'currenciesAccepted': 'LKR',
            'paymentAccepted': 'Bank Deposit, Online Bank Transfer',
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': 'Nawalapitiya Road',
              'addressLocality': 'Ulapane',
              'addressRegion': 'Central Province',
              'addressCountry': 'LK'
            }
          },
          {
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            'url': `${baseUrl}/`,
            'name': 'SCENTORY.LK',
            'description': 'Luxury Perfumes & Decants in Sri Lanka'
          }
        ]
      };
    } else {
      // Homepage
      jsonLdData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'OnlineStore',
            '@id': `${baseUrl}/#store`,
            'name': 'SCENTORY.LK',
            'url': `${baseUrl}/`,
            'logo': `${baseUrl}/brand-logo.png`,
            'image': `${baseUrl}/brand-logo.png`,
            'description': description,
            'telephone': '+94763151311',
            'priceRange': 'LKR 1,300 - LKR 25,000',
            'currenciesAccepted': 'LKR',
            'paymentAccepted': 'Bank Deposit, Online Bank Transfer',
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': 'Nawalapitiya Road',
              'addressLocality': 'Ulapane',
              'addressRegion': 'Central Province',
              'addressCountry': 'LK'
            }
          },
          {
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            'url': `${baseUrl}/`,
            'name': 'SCENTORY.LK',
            'description': 'Luxury Perfumes & Decants in Sri Lanka'
          }
        ]
      };
    }

    // Apply document title
    document.title = title;

    // Helper to safely set meta tags
    const setMeta = (nameOrProp, attrName, value) => {
      let el = document.querySelector(`meta[name="${nameOrProp}"]`) || document.querySelector(`meta[property="${nameOrProp}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, nameOrProp);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('description', 'name', description);
    setMeta('title', 'name', title);
    setMeta('og:title', 'property', title);
    setMeta('og:description', 'property', description);
    setMeta('og:url', 'property', canonical);
    setMeta('og:image', 'property', ogImage);
    setMeta('twitter:title', 'name', title);
    setMeta('twitter:description', 'name', description);
    setMeta('twitter:image', 'name', ogImage);

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);

    // Update or insert JSON-LD script tag
    let scriptTag = document.getElementById('scentory-ldjson');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'scentory-ldjson';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    if (jsonLdData) {
      scriptTag.textContent = JSON.stringify(jsonLdData, null, 2);
    }
  }, [currentView, selectedProduct]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    if (product && product.id) {
      window.history.pushState({}, '', `/product/${product.id}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view, subTab = null, options = null) => {
    if (view === 'profile') {
      setProfileTab(subTab || 'profile');
    } else if (subTab) {
      setProfileTab(subTab);
    }
    if (options && options.filter) {
      setShopFilter(options.filter);
    } else if (view !== 'shop') {
      setShopFilter(null);
    }
    setCurrentView(view);
    if (view === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else if (view === 'shop') {
      window.history.pushState({}, '', '/shop');
    } else if (view === 'reviews') {
      window.history.pushState({}, '', '/reviews');
    } else if (view === 'home') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreShop = (options = {}) => {
    setShopFilter(options?.filter || null);
    handleNavigate('shop', null, options);
  };

  const handleRequireAuth = (msg = '') => {
    setAuthMessage(msg);
    setIsAuthModalOpen(true);
  };

  // IF ADMIN ROUTE (/admin) IS ACCESSED:
  // Shows ONLY the Admin Login screen (if not logged in) or the complete Admin Dashboard (once logged in)!
  // NO store navbar, NO store pages, NO customer distractions!
  if (currentView === 'admin') {
    return (
      <AdminView
        onBackToShop={() => handleNavigate('home')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100 flex flex-col relative selection:bg-[#d4af37]/30 selection:text-white">
      {/* Scent vapor ambient floating particles and aura */}
      <ScentParticles />

      {/* Floating Toast Notification (Responsive: Never covers navigation or headers) */}
      {toastMessage && (
        <div className="fixed bottom-24 inset-x-4 sm:inset-x-auto sm:bottom-8 sm:left-8 z-50 max-w-sm sm:max-w-md mx-auto sm:mx-0 px-4 py-3 rounded-2xl bg-[#14141c]/95 border border-[#d4af37] text-white text-xs shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping flex-shrink-0" />
            <span className="truncate text-xs text-gray-200 font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="text-[#f3e5ab] font-bold hover:underline cursor-pointer text-xs whitespace-nowrap flex-shrink-0"
          >
            View Bag &rarr;
          </button>
        </div>
      )}

      {/* Public Customer Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={handleNavigate}
        openAuthModal={() => {
          setAuthMessage('');
          setIsAuthModalOpen(true);
        }}
        onOpenBankDetails={() => setIsBankModalOpen(true)}
      />

      {/* Customer Storefront Views Container */}
      <main className="flex-1 z-10">
        {currentView === 'home' && (
          <HomeView
            onExploreShop={handleExploreShop}
            onSelectProduct={handleSelectProduct}
            onOpenBankDetails={() => setIsBankModalOpen(true)}
            onNavigateReviews={() => handleNavigate('reviews')}
          />
        )}

        {currentView === 'shop' && (
          <ShopView
            initialFilter={shopFilter}
            onClearFilter={() => setShopFilter(null)}
            onSelectProduct={handleSelectProduct}
            onQuickOrder={(product) => {
              handleSelectProduct(product);
            }}
          />
        )}

        {currentView === 'reviews' && (
          <ReviewsView
            onBackToShop={() => handleNavigate('shop')}
            currentUser={user}
          />
        )}

        {currentView === 'product-detail' && (
          <ProductDetailView
            product={selectedProduct}
            isLoading={isProductLoading}
            onBack={() => handleNavigate('shop')}
            onBackToHome={() => handleNavigate('home')}
            onCheckoutNow={() => handleNavigate('checkout')}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutView
            onBackToShop={() => handleNavigate('shop')}
            onViewOrders={() => handleNavigate('profile')}
            openAuthModal={() => handleRequireAuth('Please sign in or register to place your order with bank slip.')}
          />
        )}

        {currentView === 'profile' && (
          <UserProfileView
            onBackToShop={() => handleNavigate('shop')}
            onSelectProduct={handleSelectProduct}
            openAuthModal={() => handleRequireAuth('Sign in to view your profile and orders')}
            initialTab={profileTab}
          />
        )}
      </main>

      {/* Floating Instagram, Live Chat & WhatsApp Concierge */}
      <FloatingSocials />

      {/* Cart Drawer */}
      <CartModal
        onCheckout={() => handleNavigate('checkout')}
        onContinueShopping={() => handleNavigate('shop')}
      />

      {/* Customer Auth Modal (Admin completely removed) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        message={authMessage}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />

      {/* Bank Details Modal */}
      <BankDetailsModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <FavouritesProvider>
          <MainApp />
        </FavouritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
