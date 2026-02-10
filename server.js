require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

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
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
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

// Security: Helmet (CSP disabled - handled by frontend)
// app.use(helmet());

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

// Connect to MongoDB with retry logic
let dbConnected = false;
let retryCount = 0;
const maxRetries = 5;

const connectWithRetry = async () => {
  try {
    const result = await connectDB();
    if (result && result.success) {
      dbConnected = true;
      logger.info('Database connection established');
    } else {
      if (retryCount < maxRetries) {
        retryCount++;
        logger.warn(`Database connection failed, retrying (${retryCount}/${maxRetries})...`);
        setTimeout(connectWithRetry, 5000);
      } else {
        logger.error('Database connection failed after maximum retries');
      }
    }
  } catch (err) {
    if (retryCount < maxRetries) {
      retryCount++;
      logger.error(`Database connection error: ${err.message}, retrying (${retryCount}/${maxRetries})...`);
      setTimeout(connectWithRetry, 5000);
    } else {
      logger.error('Database connection failed after maximum retries');
    }
  }
};

connectWithRetry();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: MongoDB query sanitization
// Only sanitize actual query parameters, not the entire query object
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    mongoSanitize()(req, res, next);
  } else {
    next();
  }
});

// Security: XSS protection headers
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

// Middleware to check database connection
const requireDB = (req, res, next) => {
  if (!dbConnected) {
    logger.warn(`Database not connected, blocking request to ${req.path}`);
    return res.status(503).json({ 
      error: 'Service Unavailable',
      message: 'Database connection not established. Please try again later.'
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

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'CashCompass API is running',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: ['/api/auth', '/api/transactions', '/api/goals', '/api/investments', '/api/reports', '/api/notifications']
  });
});

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
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path, method: req.method });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      message: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      error: 'Invalid ID',
      message: 'The provided ID is not valid'
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ 
      error: 'Duplicate Error',
      message: 'A record with this value already exists'
    });
  }
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message || 'An unexpected error occurred',
    path: req.path
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
