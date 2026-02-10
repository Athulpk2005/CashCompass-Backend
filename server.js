require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const winston = require('winston');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cashcompass-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Don't log to console in production (let morgan handle it)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const app = express();

// Security: CORS - must be before rate limiter to handle OPTIONS preflight
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Helmet for HTTP headers
app.use(helmet());

// Request logging with morgan
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register attempts per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Connect to MongoDB
let dbConnected = false;
connectDB().then((result) => {
  if (result && result.success) {
    dbConnected = true;
  } else {
    console.warn('Server started without database connection. Please check MongoDB configuration.');
  }
}).catch((err) => {
  console.error('Unexpected error during DB connection:', err);
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: MongoDB query sanitization (skip in test environment due to supertest incompatibility)
if (process.env.NODE_ENV !== 'test') {
  app.use(mongoSanitize());
}

// Security: XSS protection headers
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

// Middleware to check database connection
const requireDB = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({ 
      error: 'Database not available',
      message: 'Please try again later'
    });
  }
  next();
};

// Routes
app.use('/api/auth', requireDB, authRoutes);
app.use('/api/transactions', requireDB, transactionRoutes);
app.use('/api/goals', requireDB, goalRoutes);
app.use('/api/investments', requireDB, investmentRoutes);
app.use('/api/reports', requireDB, reportRoutes);
app.use('/api/notifications', requireDB, notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CashCompass API is running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
