const express = require('express');
const { body, validationResult } = require('express-validator');
const Investment = require('../models/Investment');
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

// Get all investments for user
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const query = { user: req.user.id };
    
    if (type) query.type = type;

    const investments = await Investment.find(query).sort({ purchaseDate: -1 });
    res.json(investments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create investment with validation
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Investment name is required'),
  body('type').isIn(['stock', 'mutual_fund', 'fd', 'ppf', 'nps', 'gold', 'real_estate', 'crypto', 'other']).withMessage('Invalid investment type'),
  body('investedAmount').isFloat({ min: 0 }).withMessage('Invested amount must be a positive number'),
  body('currentValue').optional().isFloat({ min: 0 }).withMessage('Current value must be a positive number'),
  body('purchaseDate').optional().isISO8601().withMessage('Invalid date format'),
], handleValidationErrors, async (req, res) => {
  try {
    const investment = await Investment.create({
      ...req.body,
      user: req.user.id
    });
    res.status(201).json(investment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update investment with validation
router.put('/:id', auth, [
  body('name').optional().trim().notEmpty().withMessage('Investment name cannot be empty'),
  body('type').optional().isIn(['stock', 'mutual_fund', 'fd', 'ppf', 'nps', 'gold', 'real_estate', 'crypto', 'other']).withMessage('Invalid investment type'),
  body('investedAmount').optional().isFloat({ min: 0 }).withMessage('Invested amount must be a positive number'),
  body('currentValue').optional().isFloat({ min: 0 }).withMessage('Current value must be a positive number'),
  body('purchaseDate').optional().isISO8601().withMessage('Invalid date format'),
], handleValidationErrors, async (req, res) => {
  try {
    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    res.json(investment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete investment
router.delete('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    res.json({ message: 'Investment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
