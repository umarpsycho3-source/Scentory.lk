const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// POST a new live chat / custom perfume creation message
router.post('/messages', async (req, res) => {
  try {
    const { customerName, phone, email, scentVision, notes, budget, message, isCustomCreation } = req.body;

    if (!customerName || !phone || (!notes && !message)) {
      return res.status(400).json({ message: 'Name, phone number, and perfume details or message are required.' });
    }

    const newMsg = {
      id: 'chat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      scentVision: (scentVision || '').trim(),
      notes: (notes || '').trim(),
      budget: (budget || '').trim(),
      message: (message || '').trim(),
      isCustomCreation: Boolean(isCustomCreation),
      read: false,
      createdAt: new Date().toISOString()
    };

    await db.addChatMessage(newMsg);

    // Create high-priority notification for Admin
    await db.addNotification({
      id: 'notif_' + Date.now(),
      type: 'chat',
      title: isCustomCreation ? '✨ New Bespoke Fragrance Creation' : '💬 Live Chat Message',
      message: `${newMsg.customerName} (${newMsg.phone}): ${newMsg.notes || newMsg.message}`,
      dataId: newMsg.id,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Your fragrance request has been submitted to the master perfumer and admin console!',
      data: newMsg
    });
  } catch (err) {
    console.error('Error submitting chat message:', err);
    res.status(500).json({ message: 'Failed to deliver message.' });
  }
});

// GET all chat & custom creation messages (Admin only)
router.get('/messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const messages = db.getChatMessages();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve messages.' });
  }
});

// PATCH mark message as read
router.patch('/messages/:id/read', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = db.markChatMessageRead(req.params.id);
    if (!updated) return res.status(404).json({ message: 'Message not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update message.' });
  }
});

// DELETE a message
router.delete('/messages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const removed = await db.deleteChatMessage(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Message not found.' });
    res.json({ message: 'Message deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete message.' });
  }
});

module.exports = router;
