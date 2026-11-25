import React, { useState } from 'react';
import { X, Star, Upload, CheckCircle2, AlertCircle, Camera, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AddReviewModal({ isOpen, onClose, onReviewAdded, preselectedProduct = '' }) {
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.city || 'Colombo');
  const [productName, setProductName] = useState(preselectedProduct || 'Oud Royale Impérial (10ml)');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('/api/reviews/upload-photo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Image upload failed');

      setImageUrl(data.photoUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim() || !comment.trim()) {
      setError('Please provide your name and your fragrance review comment.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          rating,
          productName,
          comment,
          location,
          image: imageUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      if (onReviewAdded) onReviewAdded(data.review);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity" />

      <div className="relative w-full max-w-lg glass-panel bg-[#0e0e13] border border-[#d4af37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full border border-[#d4af37]/50 p-2 mx-auto mb-2 bg-[#181822] text-[#d4af37] flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
            Verified Customer Feedback
          </span>
          <h2 className="font-serif-luxury text-xl font-bold text-white mt-0.5">
            Share Your Scent Experience
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Rate your fragrance, longevity, decant quality, and delivery service.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Star Rating Interactive Selector */}
          <div className="p-4 rounded-2xl bg-black/40 border border-[#d4af37]/25 text-center space-y-2">
            <span className="text-gray-300 font-semibold uppercase tracking-wider block text-[11px]">
              Overall Rating: {rating} Star{rating > 1 ? 's' : ''}
            </span>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-2xl transition-transform hover:scale-125 cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || rating) >= star
                        ? 'text-[#d4af37] fill-[#d4af37]'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 uppercase tracking-wider font-semibold mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Kasun Fernando"
                className="w-full px-3.5 py-2 rounded-xl bg-[#14141c] border border-white/10 text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 uppercase tracking-wider font-semibold mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Colombo 07, Kandy"
                className="w-full px-3.5 py-2 rounded-xl bg-[#14141c] border border-white/10 text-white outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 uppercase tracking-wider font-semibold mb-1">
              Fragrance Reviewed
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Oud Royale Impérial (10ml)"
              className="w-full px-3.5 py-2 rounded-xl bg-[#14141c] border border-white/10 text-white outline-none focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label className="block text-gray-300 uppercase tracking-wider font-semibold mb-1">
              Your Review & Scent Experience *
            </label>
            <textarea
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How did the fragrance smell? Longevity, packaging, atomizer quality..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#14141c] border border-white/10 text-white outline-none focus:border-[#d4af37] resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <span className="text-gray-300 uppercase tracking-wider font-semibold block text-[11px]">
              Add Photo of Your Bottle / Decant (Optional)
            </span>

            <div className="flex items-center gap-3">
              <label className="px-3 py-1.5 rounded-lg border border-dashed border-[#d4af37]/50 hover:border-[#d4af37] text-gray-300 hover:text-white cursor-pointer bg-[#181822] flex items-center gap-1.5 transition-colors">
                <Camera className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <span className="text-gray-500 text-[10px]">or</span>

              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL or uploaded photo"
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#14141c] border border-white/10 text-white text-[11px] outline-none focus:border-[#d4af37]"
              />
            </div>

            {imageUrl && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#d4af37]/40 relative mt-2">
                <img src={imageUrl} alt="Review Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 rounded-full text-red-400"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Submitting Your Review...' : 'Post Customer Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
