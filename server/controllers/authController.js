const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const channeliConfig = require('../config/channeli');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// @desc    Redirect to Channel-i OAuth
// @route   GET /api/auth/login
// @access  Public
const login = (req, res) => {
    const authUrl = `${channeliConfig.authorizationURL}?client_id=${channeliConfig.clientId}&redirect_uri=${encodeURIComponent(channeliConfig.redirectUri)}&state=random_state`;
    res.json({ authUrl });
};

// @desc    Handle Channel-i OAuth callback
// @route   GET /api/auth/callback
// @access  Public
const callback = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);
        }

        // Exchange code for token
        const tokenResponse = await axios.post(
            channeliConfig.tokenURL,
            new URLSearchParams({
                client_id: channeliConfig.clientId,
                client_secret: channeliConfig.clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: channeliConfig.redirectUri,
                code: code,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // Get user data from Channel-i
        const userDataResponse = await axios.get(channeliConfig.userDataURL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const userData = userDataResponse.data;

        // Log the user data structure for debugging
        console.log('Channel-i user data:', JSON.stringify(userData, null, 2));

        // Extract enrollment number - Channel-i uses snake_case
        // Based on scope: student.enrolment_number
        const enrollmentNumber = userData.student?.enrolment_number ||
            userData.student?.enrolmentNumber ||
            userData.enrolmentNumber ||
            userData.username;

        // Check if we have required data
        if (!enrollmentNumber) {
            console.log('No enrollment number found in:', Object.keys(userData));
            return res.redirect(`${process.env.CLIENT_URL}/login?error=not_student`);
        }

        // Based on actual Channel-i response structure:
        // - person.fullName (camelCase)
        // - person.displayPicture (relative path, needs base URL)
        // - student.enrolmentNumber
        // - student["branch department name"] (weird key with spaces!)
        // - contactInformation.instituteWebmailAddress

        const fullName = userData.person?.fullName ||
            userData.person?.full_name ||
            userData.fullName ||
            userData.full_name ||
            'Unknown User';

        // Display picture is a relative path, prepend Channel-i base URL
        let displayPicture = userData.person?.displayPicture ||
            userData.person?.display_picture ||
            null;
        if (displayPicture && !displayPicture.startsWith('http')) {
            displayPicture = `https://channeli.in${displayPicture}`;
        }

        // Branch has a weird key with spaces: "branch department name"
        const branch = userData.student?.['branch department name'] ||
            userData.student?.branch?.department?.name ||
            userData.student?.branch?.name ||
            userData.student?.branch ||
            'Unknown';

        const email = userData.contactInformation?.instituteWebmailAddress ||
            userData.contactInformation?.institute_webmail_address ||
            userData.contact_information?.instituteWebmailAddress ||
            userData.contact_information?.institute_webmail_address ||
            userData.email ||
            '';

        console.log('Extracted data:', { enrollmentNumber, fullName, branch, email });

        // Find or create user
        let user = await User.findOne({ enrollmentNumber: enrollmentNumber });

        if (user) {
            // Update user data
            user.fullName = fullName;
            user.displayPicture = displayPicture;
            user.branch = branch;
            user.email = email;
            await user.save();
        } else {
            // Create new user
            user = await User.create({
                enrollmentNumber: enrollmentNumber,
                fullName: fullName,
                displayPicture: displayPicture,
                branch: branch,
                email: email,
            });
        }

        // Generate JWT
        const token = generateToken(user._id);

        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    } catch (error) {
        console.error('OAuth callback error:', error.response?.data || error.message);
        res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
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
const logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.json({ message: 'Logged out successfully' });
};

module.exports = { login, callback, getMe, logout };
