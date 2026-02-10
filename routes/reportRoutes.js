const express = require('express');
const { query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
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

// Get summary report with date validation
router.get('/summary', auth, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
], handleValidationErrors, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get transactions
    const transactions = await Transaction.find(query);

    // Calculate totals
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    // Get category breakdown
    const categoryBreakdown = transactions.reduce((acc, t) => {
      if (t.type === 'expense') {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      }
      return acc;
    }, {});

    res.json({
      income,
      expenses,
      balance,
      categoryBreakdown,
      transactionCount: transactions.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get investment summary
router.get('/investments', auth, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.id });

    const totalInvested = investments.reduce((sum, i) => sum + i.investedAmount, 0);
    const totalCurrentValue = investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
    const totalReturns = totalCurrentValue - totalInvested;

    const byType = investments.reduce((acc, i) => {
      acc[i.type] = {
        count: (acc[i.type]?.count || 0) + 1,
        invested: (acc[i.type]?.invested || 0) + i.investedAmount,
        currentValue: (acc[i.type]?.currentValue || 0) + (i.currentValue || 0)
      };
      return acc;
    }, {});

    res.json({
      totalInvested,
      totalCurrentValue,
      totalReturns,
      byType,
      investmentCount: investments.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly spending report
router.get('/monthly', auth, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    const transactions = await Transaction.find({
      user: req.user.id,
      type: 'expense',
      date: { $gte: startDate }
    }).sort({ date: 1 });
    
    // Group by month
    const monthlyData = transactions.reduce((acc, t) => {
      const monthKey = new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      acc[monthKey] = (acc[monthKey] || 0) + t.amount;
      return acc;
    }, {});
    
    // Get last 6 months with real data only
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      let monthIndex = currentMonth - i;
      let year = currentYear;
      
      if (monthIndex < 0) {
        monthIndex += 12;
        year -= 1;
      }
      
      const monthKey = `${monthNames[monthIndex]}'${year.toString().slice(-2)}`;
      const actual = monthlyData[monthKey] || 0;
      
      // Only include months with actual spending
      if (actual > 0) {
        last6Months.push({
          month: monthNames[monthIndex],
          actual: actual,
          budget: 10000 // Default budget
        });
      }
    }
    
    // If no data, return empty array
    if (last6Months.length === 0) {
      return res.json([]);
    }
    
    res.json(last6Months);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category breakdown
router.get('/categories', auth, async (req, res) => {
  try {
    const { month } = req.query;
    const query = { user: req.user.id, type: 'expense' };
    
    if (month) {
      const startOfMonth = new Date(month + '-01');
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }
    
    const transactions = await Transaction.find(query);
    
    const categoryBreakdown = transactions.reduce((acc, t) => {
      acc[t.category] = {
        amount: (acc[t.category]?.amount || 0) + t.amount,
        count: (acc[t.category]?.count || 0) + 1
      };
      return acc;
    }, {});
    
    // Calculate percentages
    const total = Object.values(categoryBreakdown).reduce((sum, cat) => sum + cat.amount, 0);
    
    const result = Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0
    }));
    
    res.json({
      categories: result,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
