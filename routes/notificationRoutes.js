const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Get all notifications for user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create notification
router.post('/', auth, async (req, res) => {
  try {
    const { title, message, type, link } = req.body;
    
    const notification = new Notification({
      userId: req.user.id,
      title,
      message,
      type: type || 'system',
      link: link || '',
    });
    
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Seed sample notifications for testing
router.post('/seed', auth, async (req, res) => {
  try {
    const sampleNotifications = [
      {
        title: 'Goal achieved!',
        message: 'You reached your savings goal for Vacation',
        type: 'goal',
        link: '/goals',
      },
      {
        title: 'Budget alert',
        message: 'You\'ve spent 90% of your Food budget',
        type: 'budget',
        link: '/transactions',
      },
      {
        title: 'New transaction',
        message: '₹2,500 received from salary',
        type: 'transaction',
        link: '/transactions',
      },
      {
        title: 'Investment update',
        message: 'Your investment portfolio grew by 5%',
        type: 'investment',
        link: '/investments',
      },
      {
        title: 'Bill reminder',
        message: 'Electricity bill due in 3 days',
        type: 'system',
        link: '/transactions',
      },
      {
        title: 'Large expense detected',
        message: 'You spent ₹15,000 on Shopping today',
        type: 'transaction',
        link: '/transactions',
      },
      {
        title: 'Monthly report ready',
        message: 'Your January 2025 financial report is now available',
        type: 'system',
        link: '/reports',
      },
      {
        title: 'Goal milestone',
        message: 'You\'re 75% closer to your Emergency Fund goal',
        type: 'goal',
        link: '/goals',
      },
    ];

    // Create notifications with varied dates
    const notificationsToCreate = sampleNotifications.map((notif, index) => ({
      userId: req.user.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      link: notif.link,
      read: index < 2, // First 2 are unread
      createdAt: new Date(Date.now() - index * 3600000), // Staggered by hours
    }));

    await Notification.deleteMany({ userId: req.user.id });
    await Notification.insertMany(notificationsToCreate);

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      message: 'Sample notifications created successfully',
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error('Error seeding notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete all notifications
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    console.error('Error deleting all notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
