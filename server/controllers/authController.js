const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyGoogleIdToken } = require('../services/googleAuth');
const {
    PLACEHOLDER_EMAIL,
    parseIitrEmail,
    parseGoogleName,
    departmentName,
    checkAccess,
} = require('../services/accessControl');
const { logAuth } = require('../services/activityLogger');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

const IITR_HOSTED_DOMAIN = /(^|\.)iitr\.ac\.in$/;

// @desc    Log in with a Google ID token from the "Sign in with Google" button
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential || typeof credential !== 'string') {
            return res.status(400).json({ message: 'Missing Google credential' });
        }

        let payload;
        try {
            payload = await verifyGoogleIdToken(credential);
        } catch (error) {
            console.error('Google token verification failed:', error.message);
            return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
        }

        // Must be a verified account managed by IITR's Google Workspace
        const parsed = parseIitrEmail(payload.email);
        if (!payload.email_verified || !parsed || !IITR_HOSTED_DOMAIN.test(payload.hd || '')) {
            await logAuth({ fullName: payload.email }, 'LOGIN', req, false);
            return res.status(403).json({
                code: 'ACCESS_DENIED',
                reason: 'not_iitr',
                message: 'Please sign in with your IIT Roorkee email (@iitr.ac.in).',
            });
        }

        // IITR Google names end with the enrollment number: "NAME SURNAME 23114001"
        const googleName = parseGoogleName(payload.name);

        // Oldest account wins if an email is shared (see scripts/migrateToGoogleAuth.js)
        let user = await User.findOne({ email: parsed.email }).sort({ createdAt: 1 });

        // Take the enrollment number from the Google name unless another account owns it
        let enrollmentNumber = user?.enrollmentNumber || null;
        if (!enrollmentNumber && googleName.enrollmentNumber) {
            const owner = await User.findOne({ enrollmentNumber: googleName.enrollmentNumber });
            if (!owner) {
                enrollmentNumber = googleName.enrollmentNumber;
            } else if (!user && PLACEHOLDER_EMAIL.test(owner.email || '')) {
                // Seeded placeholder for this student: claim it (keeps content credited to it)
                user = owner;
                enrollmentNumber = owner.enrollmentNumber;
            } else {
                console.warn(`Enrollment ${googleName.enrollmentNumber} in Google name of ${parsed.email} already belongs to ${owner.email}`);
            }
        }

        const access = await checkAccess({ email: parsed.email, enrollmentNumber }, user?.role);
        if (!access.allowed) {
            await logAuth({ fullName: payload.name || parsed.email }, 'LOGIN', req, false);
            return res.status(403).json({
                code: 'ACCESS_DENIED',
                reason: access.reason,
                department: access.department,
                year: access.year,
                message: 'Your account is not allowed to access this platform yet.',
            });
        }

        const branch = departmentName(parsed.department);

        if (user) {
            // Keep existing names (verified via Channel-i); refresh the rest
            user.email = parsed.email;
            user.fullName = user.fullName || googleName.fullName || parsed.email;
            user.displayPicture = payload.picture || user.displayPicture;
            user.department = parsed.department;
            if (enrollmentNumber) {
                user.enrollmentNumber = enrollmentNumber;
            }
            if (!user.branch || user.branch === 'Unknown') {
                user.branch = branch;
            }
            await user.save();
        } else {
            user = await User.create({
                email: parsed.email,
                fullName: googleName.fullName || parsed.email,
                displayPicture: payload.picture || null,
                department: parsed.department,
                branch,
                ...(enrollmentNumber && { enrollmentNumber }),
            });
        }

        const token = generateToken(user._id);

        await logAuth(user, 'LOGIN', req);

        res.json({ token, user });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-__v');
        res.json(user);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    // Log logout
    if (req.user) {
        await logAuth(req.user, 'LOGOUT', req);
    }

    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.json({ message: 'Logged out successfully' });
};

module.exports = { googleLogin, getMe, logout };
