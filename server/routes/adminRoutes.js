const express = require('express');
const router = express.Router();
const {
    getUsers,
    updateUserRole,
    addQuestionForUser,
    getStats,
} = require('../controllers/adminController');
const { protect, superadmin, admin } = require('../middleware/auth');

// All routes require superadmin
router.get('/users', protect, superadmin, getUsers);
router.put('/users/:id/role', protect, superadmin, updateUserRole);
router.post('/questions', protect, superadmin, addQuestionForUser);
router.get('/stats', protect, admin, getStats);

module.exports = router;
