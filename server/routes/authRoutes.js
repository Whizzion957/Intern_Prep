const express = require('express');
const router = express.Router();
const { googleLogin, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
