const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all transactions for user
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;
    const query = { user: req.user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (type) query.type = type;
    if (category) query.category = category;

    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction with validation
router.post('/', auth, [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
], handleValidationErrors, async (req, res) => {
  try {
    const transaction = await Transaction.create({
      ...req.body,
      user: req.user.id
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction with validation
router.put('/:id', auth, [
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
], handleValidationErrors, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed sample data (for testing)
router.post('/seed', auth, async (req, res) => {
  try {
    const now = new Date();
    
    // Sample transactions
    const sampleTransactions = [
      // Income
      { type: 'income', amount: 50000, category: 'Salary', description: 'Monthly salary', date: new Date(now.getFullYear(), now.getMonth(), 1) },
      { type: 'income', amount: 5000, category: 'Freelance', description: 'Client payment', date: new Date(now.getFullYear(), now.getMonth(), 15) },
      
      // Expenses
      { type: 'expense', amount: 15000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth(), 5) },
      { type: 'expense', amount: 5000, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth(), 10) },
      { type: 'expense', amount: 3000, category: 'Food', description: 'Restaurant', date: new Date(now.getFullYear(), now.getMonth(), 12) },
      { type: 'expense', amount: 2500, category: 'Transport', description: 'Gas/fuel', date: new Date(now.getFullYear(), now.getMonth(), 8) },
      { type: 'expense', amount: 2000, category: 'Shopping', description: 'Clothing', date: new Date(now.getFullYear(), now.getMonth(), 18) },
      { type: 'expense', amount: 1500, category: 'Entertainment', description: 'Movies & games', date: new Date(now.getFullYear(), now.getMonth(), 20) },
      { type: 'expense', amount: 8000, category: 'Utilities', description: 'Electricity & water', date: new Date(now.getFullYear(), now.getMonth(), 25) },
      { type: 'expense', amount: 3000, category: 'Healthcare', description: 'Medicine', date: new Date(now.getFullYear(), now.getMonth(), 22) },
      
      // Previous months
      { type: 'expense', amount: 12000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth() - 1, 5) },
      { type: 'expense', amount: 4500, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth() - 1, 10) },
      { type: 'expense', amount: 2800, category: 'Transport', description: 'Gas/fuel', date: new Date(now.getFullYear(), now.getMonth() - 1, 8) },
      { type: 'expense', amount: 10000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth() - 2, 5) },
      { type: 'expense', amount: 4000, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth() - 2, 10) },
      { type: 'expense', amount: 3500, category: 'Transport', description: 'Gas/fuel', date: new Date(now.getFullYear(), now.getMonth() - 2, 8) },
      { type: 'expense', amount: 14000, category: 'Housing', description: 'Rent payment', date: new Date(now.getFullYear(), now.getMonth() - 3, 5) },
      { type: 'expense', amount: 5000, category: 'Food', description: 'Groceries', date: new Date(now.getFullYear(), now.getMonth() - 3, 10) },
      { type: 'expense', amount: 3000, category: 'Transport', description: 'Gas/fuel', date: new Date(now.getFullYear(), now.getMonth() - 3, 8) },
    ];
    
    // Delete existing transactions for this user
    await Transaction.deleteMany({ user: req.user.id });
    
    // Insert sample transactions
    await Transaction.insertMany(
      sampleTransactions.map(t => ({
        ...t,
        user: req.user.id,
        name: t.description,
        status: 'Completed'
      }))
    );
    
    res.json({ message: 'Sample data seeded successfully', count: sampleTransactions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
