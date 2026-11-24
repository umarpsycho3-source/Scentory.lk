const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public settings (Store details, bank account info, shipping fees)
router.get('/', async (req, res) => {
  try {
    const settings = db.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving store settings.' });
  }
});

// Update settings (Admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updates = req.body || {};
    
    // Automatically sanitize and intercept large base64 video uploads to prevent database JSON bloating
    if (updates.heroVideoUrl && typeof updates.heroVideoUrl === 'string' && updates.heroVideoUrl.startsWith('data:video')) {
      try {
        const matches = updates.heroVideoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          const publicPath = path.join(__dirname, '..', '..', 'client', 'public', 'hero-uploaded-video.mp4');
          const serverPath = path.join(__dirname, '..', 'uploads', 'hero-uploaded-video.mp4');
          fs.writeFileSync(publicPath, buffer);
          try { fs.writeFileSync(serverPath, buffer); } catch (e) {}
          updates.heroVideoUrl = '/hero-uploaded-video.mp4';
        }
      } catch (e) {
        console.error('Failed to convert base64 video to file:', e);
        updates.heroVideoUrl = '/hero-perfume-video.mp4';
      }
    }

    const updatedSettings = await db.updateSettings(updates);
    res.json({
      message: 'Store settings updated successfully.',
      settings: updatedSettings
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ message: 'Failed to update store settings.' });
  }
});

module.exports = router;
