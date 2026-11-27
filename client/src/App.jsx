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
      fetch(`/api/products/${route.productId}`)
        .then(res => res.json())
        .then(prod => {
          if (prod && prod.id) {
            setSelectedProduct(prod);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Listen to browser URL changes (e.g. typing /admin, /shop, /reviews or browser back/forward)
  useEffect(() => {
    const checkUrl = () => {
      const route = resolveViewFromUrl();
      setCurrentView(route.view);
      if (route.view === 'product-detail' && route.productId && (!selectedProduct || selectedProduct.id !== route.productId)) {
        fetch(`/api/products/${route.productId}`)
          .then(res => res.json())
          .then(prod => {
            if (prod && prod.id) setSelectedProduct(prod);
          })
          .catch(() => {});
      }
    };

    window.addEventListener('popstate', checkUrl);
    return () => window.removeEventListener('popstate', checkUrl);
  }, [selectedProduct]);

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
            onBack={() => handleNavigate('shop')}
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
