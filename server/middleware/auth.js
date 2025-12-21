const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from Authorization header or cookie
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-__v');

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// Check if user is admin or superadmin
const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

// Check if user is superadmin
const superadmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as superadmin' });
    }
};

// Check if user is owner of the resource
const ownerOrAdmin = (model) => async (req, res, next) => {
    try {
        const resource = await model.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        const ownerId = resource.submittedBy || resource.addedBy;

        if (
            ownerId.toString() === req.user._id.toString() ||
            req.user.role === 'admin' ||
            req.user.role === 'superadmin'
        ) {
            req.resource = resource;
            next();
        } else {
            res.status(403).json({ message: 'Not authorized to modify this resource' });
        }
    } catch (error) {
        console.error('Owner check error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { protect, admin, superadmin, ownerOrAdmin };
