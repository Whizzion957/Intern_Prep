const express = require('express');
const router = express.Router();
const { login, callback, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.get('/login', login);
router.get('/callback', callback);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
