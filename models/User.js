const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  themeMode: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'KRW', 'BRL', 'RUB', 'AUD', 'CAD', 'CHF', 'SGD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'ZAR', 'MXN'],
    default: 'USD'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
