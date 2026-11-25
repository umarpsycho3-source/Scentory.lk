const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Setup multer for review photo uploads
const reviewUploadDir = path.join(__dirname, '..', 'uploads', 'reviews');
if (!fs.existsSync(reviewUploadDir)) {
  try {
  fs.mkdirSync(reviewUploadDir, { recursive: true });
  } catch (err) { /* serverless read-only filesystem */ }
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed.'));
  }
});

// Image upload for reviews
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No photo provided.' });
  }
  const mime = req.file.mimetype || 'image/jpeg';
  const base64 = req.file.buffer.toString('base64');
  const photoUrl = `data:${mime};base64,${base64}`;

  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = `review-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
  try {
    fs.writeFileSync(path.join(reviewUploadDir, filename), req.file.buffer);
  } catch (e) {}

  res.json({ photoUrl, filename });
});

// GET all reviews with rating metrics
router.get('/', async (req, res) => {
  try {
    const reviews = db.getReviews();
    const total = reviews.length;

    let averageRating = 5.0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (total > 0) {
      const sum = reviews.reduce((acc, r) => {
        const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
        distribution[star] = (distribution[star] || 0) + 1;
        return acc + Number(r.rating || 5);
      }, 0);
      averageRating = (sum / total).toFixed(1);
    }

    res.json({
      reviews,
      total,
      averageRating: Number(averageRating),
      distribution
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ message: 'Failed to retrieve reviews.' });
  }
});

// POST new customer review
router.post('/', async (req, res) => {
  try {
    const { customerName, rating, productName, comment, location, image } = req.body;

    if (!customerName || !rating || !comment) {
      return res.status(400).json({ message: 'Customer name, star rating, and review comments are required.' });
    }

    const newReview = {
      id: 'rev_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      customerName: customerName.trim(),
      rating: Math.max(1, Math.min(5, Number(rating))),
      productName: productName ? productName.trim() : 'Signature Extrait Flacon',
      comment: comment.trim(),
      location: location ? location.trim() : 'Sri Lanka',
      image: image ? image.trim() : null,
      verifiedBuyer: true,
      createdAt: new Date().toISOString()
    };

    await db.addReview(newReview);
    res.status(201).json({ message: 'Review submitted successfully!', review: newReview });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ message: 'Failed to submit review.' });
  }
});

// ADMIN: Delete Review
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const removed = await db.deleteReview(req.params.id);
    if (!removed) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    res.json({ message: 'Review deleted successfully.', review: removed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review.' });
  }
});

module.exports = router;
