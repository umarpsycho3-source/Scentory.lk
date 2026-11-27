import React, { useState, useEffect } from 'react';
import { Star, Sparkles, CheckCircle2, MessageSquare, Plus, ArrowLeft, Camera, Filter, Trash2 } from 'lucide-react';
import AddReviewModal from '../components/AddReviewModal';
import { useAuth } from '../context/AuthContext';

export default function ReviewsView({ onBackToShop, currentUser }) {
  const { user: authUser, isAdmin } = useAuth();
  const effectiveUser = currentUser || authUser;
  const [reviewsData, setReviewsData] = useState({
    reviews: [],
    total: 0,
    averageRating: 5.0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const fetchReviews = () => {
    setLoading(true);
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        setReviewsData(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Admin Action: Are you sure you want to delete this customer review?')) return;
    try {
      const token = localStorage.getItem('scentory_token');
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete review');
      fetchReviews();
    } catch (err) {
      alert('Error deleting review: ' + err.message);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const reviewsList = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [];
  const filteredReviews = reviewsList.filter(r => {
    if (!r) return false;
    if (starFilter === 'all') return true;
    return Number(r.rating) === Number(starFilter);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <a
              href="/shop"
              onClick={(e) => { e.preventDefault(); onBackToShop(); }}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-gray-400 hover:text-[#d4af37] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Fragrances</span>
            </a>
            <span className="text-gray-600">|</span>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <a
                href="/"
                onClick={(e) => { e.preventDefault(); onBackToShop(); }}
                className="hover:text-[#d4af37] transition-colors cursor-pointer"
              >
                Home
              </a>
              <span className="text-gray-600">&gt;</span>
              <span className="text-[#fcf6ba] font-serif-luxury">
                Customer Reviews
              </span>
            </nav>
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#d4af37] font-semibold block mb-1">
            Real Customer Testimonials
          </span>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-wide">
            Customer Reviews & Ratings
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authentic experiences from verified fragrance connoisseurs across Sri Lanka.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-90 shadow-[0_0_20px_rgba(212,175,55,0.35)] flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Write Customer Review</span>
        </button>
      </div>

      {/* OVERALL RATING KPI BANNER */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#d4af37]/30 mb-10 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Average Score */}
          <div className="lg:col-span-4 text-center lg:text-left lg:border-r border-white/10 lg:pr-8">
            <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
              Overall Customer Satisfaction
            </span>
            <div className="flex items-baseline justify-center lg:justify-start gap-3">
              <span className="font-serif-luxury text-5xl font-extrabold gold-text-gradient">
                {reviewsData.averageRating || 5.0}
              </span>
              <span className="text-gray-400 text-base">/ 5.0</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-1 my-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-[#d4af37] fill-[#d4af37]" />
              ))}
            </div>
            <span className="text-xs text-[#f3e5ab] font-medium block">
              Based on {reviewsData?.total || 0} Verified Sri Lankan Customer Reviews
            </span>
          </div>

          {/* Star Distribution Bars */}
          <div className="lg:col-span-5 space-y-2 text-xs">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = reviewsData.distribution?.[stars] || 0;
              const percent = reviewsData.total > 0 ? Math.round((count / reviewsData.total) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span className="w-12 text-gray-300 font-mono text-[11px]">{stars} Stars</span>
                  <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[#d4af37] to-[#fbf5b7] rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-gray-400 text-[11px] font-mono">{count} ({percent}%)</span>
                </div>
              );
            })}
          </div>

          {/* Trust Guarantees */}
          <div className="lg:col-span-3 lg:border-l border-white/10 lg:pl-8 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>100% Verified Purchases</span>
            </div>
            <div className="flex items-center gap-2 text-[#f3e5ab]">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-[#d4af37]" />
              <span>Authentic Decant Quality</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Camera className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span>Real Customer Photo Proofs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 text-xs">
        <span className="text-gray-400 text-[11px] uppercase font-semibold mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter:</span>
        </span>
        {['all', '5', '4', '3'].map((star) => (
          <button
            key={star}
            onClick={() => setStarFilter(star)}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wider transition-all cursor-pointer ${
              starFilter === star
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md'
                : 'border-white/10 bg-[#121218] text-gray-300 hover:text-white hover:border-white/25'
            }`}
          >
            {star === 'all' ? 'All Reviews' : `${star} Stars Only`}
          </button>
        ))}
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-[#d4af37]/20 my-8">
          <p className="text-base text-gray-300 font-serif-luxury mb-2">No reviews found for this rating</p>
          <button
            onClick={() => setStarFilter('all')}
            className="px-5 py-2 rounded-full bg-[#d4af37] text-black font-semibold text-xs uppercase tracking-wider"
          >
            View All Reviews
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="glass-panel p-6 rounded-2xl border border-[#d4af37]/25 hover:border-[#d4af37]/60 transition-all shadow-xl flex flex-col justify-between space-y-4 hover:-translate-y-1"
            >
              <div className="space-y-3">
                {/* Stars & Verified Badge */}
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

                  {rev.verifiedBuyer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified Buyer</span>
                    </span>
                  )}
                </div>

                {/* Fragrance Tag */}
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#161622] text-[#f3e5ab] text-[11px] font-medium border border-[#d4af37]/20">
                  {rev.productName}
                </div>

                {/* Comment */}
                <p className="text-xs text-gray-200 leading-relaxed font-light">
                  "{rev.comment}"
                </p>

                {/* Optional Customer Photo */}
                {rev.image && (
                  <div
                    onClick={() => setPreviewPhoto(rev.image)}
                    className="relative w-28 h-20 rounded-xl overflow-hidden border border-[#d4af37]/30 cursor-pointer group mt-2"
                  >
                    <img src={rev.image} alt="Customer Bottle" className="w-full h-full object-cover group-hover:scale-108 transition-transform" />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white opacity-80" />
                    </div>
                  </div>
                )}
              </div>

              {/* Author Info & Date */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                <div>
                  <span className="font-semibold text-white block">{rev.customerName}</span>
                  <span className="text-[10px] text-[#c5a059]">{rev.location || 'Sri Lanka'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                  {(effectiveUser?.role === 'admin' || isAdmin) && (
                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-1 rounded-md bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                      title="Admin: Delete Review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Lightbox */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl w-full max-h-[85vh] p-2 glass-panel rounded-2xl border border-[#d4af37]/40 shadow-2xl">
            <img src={previewPhoto} alt="Customer Review Photo" className="w-full h-auto max-h-[80vh] object-contain rounded-xl mx-auto" />
            <p className="text-center text-xs text-gray-400 mt-2">Click anywhere to close photo</p>
          </div>
        </div>
      )}

      {/* Add Review Modal */}
      <AddReviewModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onReviewAdded={(newRev) => {
          fetchReviews();
        }}
      />
    </div>
  );
}
