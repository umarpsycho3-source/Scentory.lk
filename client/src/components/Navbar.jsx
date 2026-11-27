import React, { useState } from 'react';
import { 
  ShoppingBag, 
  User, 
  Menu, 
  X, 
  Phone, 
  Sparkles, 
  LogOut, 
  PackageCheck, 
  Heart, 
  Home, 
  Star, 
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../context/FavouritesContext';

function InstagramIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export default function Navbar({ currentView, setCurrentView, openAuthModal, onOpenBankDetails }) {
  const { user, logout } = useAuth();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { favouritesCount } = useFavourites();
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleNav = (view, subTab = null) => {
    if (view === 'cart') {
      setSideDrawerOpen(false);
      setUserDropdownOpen(false);
      setIsCartOpen(true);
      return;
    }

    setCurrentView(view, subTab);
    setSideDrawerOpen(false);
    setUserDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mobile Drawer Navigation Items (Brand Story & Video and Store Policy removed as requested)
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, view: 'home' },
    { id: 'shop', label: 'All Fragrances', icon: Sparkles, view: 'shop' },
    { id: 'cart', label: 'My Shopping Bag', icon: ShoppingBag, view: 'cart', badge: totalItemCount, badgeColor: 'bg-[#d4af37] text-black font-bold' },
    { id: 'favourites', label: 'My Favourites', icon: Heart, view: 'profile', subTab: 'favourites', badge: favouritesCount, badgeColor: 'bg-rose-500 text-white font-bold' },
    { id: 'orders', label: 'My Orders & Slips', icon: PackageCheck, view: 'profile', subTab: 'orders' },
    { id: 'reviews', label: 'Customer Reviews', icon: Star, view: 'reviews' },
    { id: 'profile', label: 'My Profile & Details', icon: User, view: 'profile', subTab: 'profile' },
  ];

  return (
    <>
      {/* Sticky Main Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#08080a]/95 backdrop-blur-xl border-b border-[#d4af37]/20 transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between w-full">
          
          {/* Left: Mobile Menu Trigger (Mobile Only, Positioned on Left as requested) + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink min-w-0">
            {/* Mobile Menu Button - ONLY appears on mobile (hidden on desktop) and on the LEFT */}
            <button
              onClick={() => setSideDrawerOpen(true)}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
              className="md:hidden relative px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-[#14141c] border border-[#d4af37]/45 hover:border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/15 transition-all cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-1.5 group active:scale-95 flex-shrink-0"
            >
              <Menu className="w-4 h-4 text-[#d4af37] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest text-[#fcf6ba] font-bold font-serif-luxury">
                Menu
              </span>

              {/* Notification Badge: Total items or favourites */}
              {(totalItemCount > 0 || favouritesCount > 0) && (
                <span className="absolute -top-1 -right-1 bg-[#d4af37] text-black font-extrabold text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-lg font-mono animate-pulse">
                  {totalItemCount > 0 ? totalItemCount : favouritesCount}
                </span>
              )}
            </button>

            {/* Brand Logo & Name */}
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); handleNav('home'); }}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-shrink min-w-0 select-none"
            >
              <div className="relative w-8 h-8 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-[#d4af37]/50 p-0.5 bg-black/80 shadow-[0_0_12px_rgba(212,175,55,0.25)] group-hover:border-[#d4af37] transition-all flex-shrink-0">
                <img
                  src="/brand-logo.png"
                  alt="SCENTORY.LK"
                  className="w-full h-full object-cover scale-110"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-serif-luxury text-sm xs:text-base sm:text-2xl font-bold tracking-[0.1em] sm:tracking-[0.2em] gold-text-gradient uppercase leading-none truncate">
                  SCENTORY<span className="text-xs font-normal text-gray-300">.LK</span>
                </span>
                <span className="text-[8px] sm:text-[9px] tracking-[0.2em] text-[#c5a059] uppercase mt-0.5 hidden sm:block truncate">
                  Signature Fragrances
                </span>
              </div>
            </a>
          </div>

          {/* Center (Desktop Only): Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-widest uppercase font-semibold">
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); handleNav('home'); }}
              className={`transition-colors hover:text-[#d4af37] cursor-pointer pb-0.5 ${
                currentView === 'home' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-300'
              }`}
            >
              Home
            </a>
            <a
              href="/shop"
              onClick={(e) => { e.preventDefault(); handleNav('shop'); }}
              className={`transition-colors hover:text-[#d4af37] cursor-pointer pb-0.5 ${
                currentView === 'shop' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-300'
              }`}
            >
              All Fragrances
            </a>
            <a
              href="/reviews"
              onClick={(e) => { e.preventDefault(); handleNav('reviews'); }}
              className={`transition-colors hover:text-[#d4af37] cursor-pointer pb-0.5 ${
                currentView === 'reviews' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-300'
              }`}
            >
              Customer Reviews
            </a>
          </nav>

          {/* Right: Desktop Actions Only (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {/* Favourites Heart Icon */}
            <button
              onClick={() => handleNav('profile', 'favourites')}
              title="My Favourites & Wishlist"
              aria-label="My Favourites & Wishlist"
              className="relative p-2.5 rounded-full bg-[#14141c] border border-[#d4af37]/35 hover:border-[#d4af37] transition-all hover:scale-105 shadow-[0_0_12px_rgba(212,175,55,0.15)] group cursor-pointer"
            >
              <Heart className={`w-4 h-4 transition-colors ${favouritesCount > 0 ? 'text-rose-400 fill-rose-500' : 'text-gray-300 group-hover:text-rose-400'}`} />
              {favouritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-lg font-mono">
                  {favouritesCount}
                </span>
              )}
            </button>

            {/* Desktop User Account Avatar (Direct Navigation to Customer Profile on Click) */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => handleNav('profile', 'profile')}
                  title={`My Account & Profile (${user.name})`}
                  aria-label={`My Account & Profile (${user.name})`}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-extrabold text-xs uppercase flex items-center justify-center font-serif-luxury shadow-[0_0_12px_rgba(212,175,55,0.4)] ring-2 ring-[#d4af37]/60 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
                >
                  {user.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
                </button>
              ) : (
                <button
                  onClick={openAuthModal}
                  title="Sign In / Register"
                  aria-label="Sign In / Register"
                  className="w-10 h-10 rounded-full border border-[#d4af37]/50 bg-[#14141c] hover:border-[#d4af37] hover:bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                >
                  <User className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop Shopping Cart Icon */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full bg-[#14141c] border border-[#d4af37]/35 hover:border-[#d4af37] transition-all hover:scale-105 shadow-[0_0_12px_rgba(212,175,55,0.15)] group cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-[#d4af37] group-hover:text-[#f3e5ab]" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#d4af37] text-black font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  {totalItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* LUXURY SIDE DRAWER NAVIGATION (For Mobile, Smooth Slide-in from Left) */}
      {sideDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Dimmed Blurred Backdrop - tap outside to close */}
          <div 
            onClick={() => setSideDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          />

          {/* Drawer Sidebar */}
          <div className="relative w-[85vw] max-w-[320px] sm:max-w-[340px] h-full bg-[#0a0a0f]/98 border-r border-[#d4af37]/30 shadow-2xl flex flex-col justify-between p-6 overflow-y-auto z-10 animate-in slide-in-from-left duration-300">
            
            {/* Top Section: Close Button & Customer Profile Avatar */}
            <div>
              {/* Close Button & Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/15">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-semibold">
                    SCENTORY CONCIERGE
                  </span>
                </div>
                <button
                  onClick={() => setSideDrawerOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close Navigation"
                >
                  <X className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              {/* Profile Avatar Card with Glowing Halo */}
              <div className="my-6 flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] blur-md opacity-60 animate-pulse" />
                  
                  {user ? (
                    <div
                      onClick={() => handleNav('profile', 'profile')}
                      className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-extrabold text-2xl uppercase flex items-center justify-center font-serif-luxury shadow-xl ring-2 ring-black select-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    >
                      {user.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setSideDrawerOpen(false);
                        openAuthModal();
                      }}
                      className="relative w-20 h-20 rounded-full bg-[#14141c] border-2 border-[#d4af37] text-[#d4af37] flex items-center justify-center shadow-xl ring-2 ring-black cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    >
                      <User className="w-8 h-8 text-[#d4af37]" />
                    </div>
                  )}
                </div>

                {user ? (
                  <div
                    onClick={() => handleNav('profile', 'profile')}
                    className="space-y-0.5 cursor-pointer"
                  >
                    <h3 className="font-serif-luxury text-base font-bold text-white tracking-wide hover:text-[#d4af37] transition-colors">
                      {user.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 truncate max-w-[200px] font-mono">
                      {user.email}
                    </p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#d4af37]/20 text-[#fcf6ba] border border-[#d4af37]/40 uppercase tracking-wider">
                      Verified Member
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h3 className="font-serif-luxury text-sm font-bold text-white tracking-wide">
                      Welcome Fragrance Lover
                    </h3>
                    <p className="text-[10px] text-gray-400 max-w-[200px]">
                      Sign in to track orders, bank slips & your saved signature scents.
                    </p>
                    <button
                      onClick={() => {
                        setSideDrawerOpen(false);
                        openAuthModal();
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-semibold text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In / Register</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Vertical Navigation Links */}
              <nav className="space-y-1.5 pt-2 border-t border-[#d4af37]/15">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.view && (!item.subTab || currentView === 'profile');
                  const itemHref = item.view === 'home' ? '/' : (item.view === 'shop' ? '/shop' : (item.view === 'reviews' ? '/reviews' : null));

                  const content = (
                    <>
                      <div className="flex items-center gap-3.5">
                        <Icon className={`w-5 h-5 transition-colors ${
                          isActive ? 'text-[#d4af37]' : (item.id === 'favourites' && favouritesCount > 0 ? 'text-rose-400 fill-rose-500' : 'text-gray-400 group-hover:text-[#d4af37]')
                        }`} />
                        <span className="text-xs sm:text-sm tracking-wider uppercase font-medium">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shadow ${item.badgeColor || 'bg-[#d4af37] text-black'}`}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          isActive ? 'text-[#d4af37] translate-x-1' : 'text-gray-500 group-hover:translate-x-1'
                        }`} />
                      </div>
                    </>
                  );

                  const commonClasses = `w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#d4af37]/25 via-[#d4af37]/10 to-transparent border border-[#d4af37]/50 text-[#fcf6ba] font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                      : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`;

                  if (itemHref) {
                    return (
                      <a
                        key={item.id}
                        href={itemHref}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNav(item.view, item.subTab);
                        }}
                        className={commonClasses}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.view, item.subTab)}
                      className={commonClasses}
                    >
                      {content}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Drawer Actions: WhatsApp Concierge, Social & Logout */}
            <div className="pt-6 border-t border-[#d4af37]/20 space-y-3">
              {/* WhatsApp Quick Direct Link */}
              <a
                href="https://wa.me/94763151311"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs hover:bg-emerald-950/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">Concierge WhatsApp</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-400 font-semibold">0763151311</span>
              </a>

              {/* Instagram Follow */}
              <a
                href="https://www.instagram.com/scentory.lk"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs hover:bg-purple-950/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <InstagramIcon className="w-4 h-4 text-pink-400" />
                  <span className="font-medium">Follow on Instagram</span>
                </div>
                <span className="text-[11px] text-pink-300">@scentory.lk</span>
              </a>

              {/* Sign Out (if logged in) */}
              {user && (
                <button
                  onClick={() => {
                    logout();
                    setSideDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-950/40 border border-red-500/25 text-red-400 hover:bg-red-900/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}

              {/* Location Tag */}
              <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest pt-1">
                SCENTORY • Ulapane, Sri Lanka
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
