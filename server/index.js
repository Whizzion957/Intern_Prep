require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');

// Import routes
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const questionRoutes = require('./routes/questionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const backupRoutes = require('./routes/backupRoutes');
const logRoutes = require('./routes/logRoutes');

const app = express();

// Connect to database
connectDB();

// Initialize Redis for rate limiting
initRedis();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet - Sets various HTTP headers for security
app.use(helmet());

// Response compression - Reduces response size for faster transfers
app.use(compression());

// CORS configuration
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    })
);

// Body parser - increased limit for rich text content
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// NoSQL Injection Protection - Custom sanitizer for req.body
// Removes keys starting with $ or containing . to prevent MongoDB injection
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
        } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
        }
    }
    return obj;
};
app.use((req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    next();
});

// ===========================================
// API RATE LIMITING (DDoS Protection)
// ===========================================

// General API rate limit - 200 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter auth rate limit - 10 requests per 15 minutes (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        error: 'Too many login attempts',
        message: 'Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ===========================================
// ROUTES
// ===========================================

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/logs', logRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message || 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
