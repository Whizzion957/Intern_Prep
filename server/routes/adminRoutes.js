const express = require('express');
const router = express.Router();
const {
    getUsers,
    updateUserRole,
    updateUserEnrollment,
    addQuestionForUser,
    getStats,
    getAccessRules,
    updateAccessRules,
} = require('../controllers/adminController');
const { protect, superadmin, admin } = require('../middleware/auth');

// All routes require superadmin
router.get('/users', protect, superadmin, getUsers);
router.put('/users/:id/role', protect, superadmin, updateUserRole);
router.put('/users/:id/enrollment', protect, superadmin, updateUserEnrollment);
router.post('/questions', protect, superadmin, addQuestionForUser);
router.get('/stats', protect, admin, getStats);
router.get('/access', protect, superadmin, getAccessRules);
router.put('/access', protect, superadmin, updateAccessRules);

module.exports = router;
