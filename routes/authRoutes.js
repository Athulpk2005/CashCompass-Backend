const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register user with validation
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      phone: user.phone,
      themeMode: user.themeMode,
      createdAt: user.createdAt,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user with validation
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      phone: user.phone,
      themeMode: user.themeMode,
      createdAt: user.createdAt,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Seed sample data for user
router.post('/seed-data', auth, async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const Goal = require('../models/Goal');
    const now = new Date();
    
    // Check if data already exists
    const existingTransactions = await Transaction.countDocuments({ user: req.user.id });
    if (existingTransactions > 0) {
      return res.json({ message: 'Data already exists' });
    }
    
    // Sample transactions
    const sampleTransactions = [
      { type: 'income', amount: 50000, category: 'Salary', description: 'Monthly salary', date: new Date(now.getFullYear(), now.getMonth(), 1), name: 'Salary' },
      { type: 'income', amount: 5000, category: 'Freelance', description: 'Client payment', date: new Date(now.getFullYear(), now.getMonth(), 15), name: 'Freelance' },
      { type: 'expense', amount: 15000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth(), 5), name: 'Rent' },
      { type: 'expense', amount: 5000, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth(), 10), name: 'Groceries' },
      { type: 'expense', amount: 3000, category: 'Food', description: 'Restaurant', date: new Date(now.getFullYear(), now.getMonth(), 12), name: 'Restaurant' },
      { type: 'expense', amount: 2500, category: 'Transport', description: 'Gas/fuel', date: new Date(now.getFullYear(), now.getMonth(), 8), name: 'Gas' },
      { type: 'expense', amount: 2000, category: 'Shopping', description: 'Clothing', date: new Date(now.getFullYear(), now.getMonth(), 18), name: 'Clothing' },
      { type: 'expense', amount: 1500, category: 'Entertainment', description: 'Movies & games', date: new Date(now.getFullYear(), now.getMonth(), 20), name: 'Entertainment' },
      { type: 'expense', amount: 8000, category: 'Utilities', description: 'Electricity & water', date: new Date(now.getFullYear(), now.getMonth(), 25), name: 'Utilities' },
      { type: 'expense', amount: 3000, category: 'Healthcare', description: 'Medicine', date: new Date(now.getFullYear(), now.getMonth(), 22), name: 'Healthcare' },
      // Previous months
      { type: 'expense', amount: 12000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth() - 1, 5), name: 'Rent' },
      { type: 'expense', amount: 4500, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth() - 1, 10), name: 'Groceries' },
      { type: 'expense', amount: 2800, category: 'Transport', description: 'Gas/fuel', date: new Date(now.getFullYear(), now.getMonth() - 1, 8), name: 'Gas' },
      { type: 'expense', amount: 10000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth() - 2, 5), name: 'Rent' },
      { type: 'expense', amount: 4000, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth() - 2, 10), name: 'Groceries' },
      { type: 'expense', amount: 3500, category: 'Transport', description: 'Gas/fuel', date: new Date(now.getFullYear(), now.getMonth() - 2, 8), name: 'Gas' },
      { type: 'expense', amount: 14000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth() - 3, 5), name: 'Rent' },
      { type: 'expense', amount: 5000, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth() - 3, 10), name: 'Groceries' },
    ];
    
    // Insert transactions
    await Transaction.insertMany(
      sampleTransactions.map(t => ({
        ...t,
        user: req.user.id,
        status: 'Completed'
      }))
    );
    
    // Sample goals
    const sampleGoals = [
      { name: 'Emergency Fund', targetAmount: 100000, currentAmount: 45000, category: 'Savings', icon: 'MdShield', color: '#13ec5b', deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), status: 'active' },
      { name: 'Vacation', targetAmount: 50000, currentAmount: 20000, category: 'Travel', icon: 'MdFlight', color: '#3b82f6', deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), status: 'active' },
      { name: 'New Car', targetAmount: 500000, currentAmount: 120000, category: 'Vehicle', icon: 'MdDirectionsCar', color: '#f97316', deadline: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), status: 'active' },
      { name: 'Home Down Payment', targetAmount: 1000000, currentAmount: 300000, category: 'Housing', icon: 'MdHome', color: '#8b5cf6', deadline: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000), status: 'active' },
    ];
    
    // Insert goals
    await Goal.insertMany(
      sampleGoals.map(g => ({
        ...g,
        user: req.user.id
      }))
    );
    
    res.json({ message: 'Sample data created successfully', transactions: sampleTransactions.length, goals: sampleGoals.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, profileImage, themeMode, currency } = req.body;
    
    // Valid currency codes
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'KRW', 'BRL', 'RUB', 'AUD', 'CAD', 'CHF', 'SGD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'ZAR', 'MXN'];
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(profileImage !== undefined && { profileImage }),
        ...(themeMode !== undefined && { themeMode }),
        ...(currency && validCurrencies.includes(currency) && { currency })
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password with validation
router.put('/password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is different from current
    const passwordCheck = await user.comparePassword(newPassword);
    if (passwordCheck) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Update password (will be hashed by pre('save') middleware)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
