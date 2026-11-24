const express = require('express');
const router = express.Router();
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
    const updates = req.body;
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
