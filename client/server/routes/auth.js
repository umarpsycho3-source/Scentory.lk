const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, city } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'customer',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      createdAt: new Date().toISOString()
    };

    await db.addUser(newUser);

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful! Welcome to SCENTORY.LK',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        address: newUser.address,
        city: newUser.city
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed due to a server error.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter your email and password.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || ''
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed due to a server error.' });
  }
});

// Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Update Profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, city, password } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (address !== undefined) updates.address = address.trim();
    if (city !== undefined) updates.city = city.trim();

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await db.updateUser(req.user.id, updates);
    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

// 1. Customer Requests Password Reset Code (Goes to Admin Notification & generates 6-digit code)
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Please enter your registered Gmail or email address.' });
    }

    const user = db.getUserByEmail(email.trim());
    if (!user) {
      return res.status(404).json({ message: 'No registered customer account found with this email address.' });
    }

    const resetData = await db.createPasswordResetRequest(user.email);
    if (!resetData) {
      return res.status(500).json({ message: 'Failed to generate reset code.' });
    }

    res.json({
      message: 'Reset request received! Your verification code has been dispatched to the Admin Panel. Please contact the Admin on WhatsApp to get your 6-digit verification code.',
      email: user.email,
      name: user.name,
      phone: user.phone || ''
    });
  } catch (err) {
    console.error('Request reset error:', err);
    res.status(500).json({ message: 'Failed to process reset request.' });
  }
});

// 2. Customer Submits 6-digit Verification Code (Given by Admin) + New Password
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, 6-digit verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const pendingRequest = db.getResetRequestByEmail(email.trim());
    if (!pendingRequest) {
      return res.status(400).json({ message: 'No active password reset request found for this email. Please request a new code.' });
    }

    // Check expiration
    if (new Date(pendingRequest.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'This verification code has expired. Please request a new code.' });
    }

    // Check code match
    if (String(pendingRequest.code).trim() !== String(code).trim()) {
      return res.status(400).json({ message: 'Incorrect verification code. Please check the 6-digit code given by the Admin.' });
    }

    const user = db.getUserByEmail(email.trim());
    if (!user) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await db.updateUser(user.id, { password: hashedPassword });

    // Consume reset request
    db.consumeResetRequest(email.trim(), code);

    // Notify Admin of completed reset
    await db.addNotification({
      id: 'notif_' + Date.now(),
      type: 'user',
      title: '✅ Password Reset Confirmed',
      message: `Customer ${user.name} (${user.email}) successfully verified with code ${code} and updated their password.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      message: 'Password reset verified successfully! You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('Verify reset error:', err);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});

// Alias for backwards compatibility
router.post('/forgot-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (code) {
    req.url = '/verify-reset-code';
    return router.handle(req, res);
  }
  return res.status(400).json({ message: 'Please request a verification code from Admin first.' });
});

module.exports = router;
