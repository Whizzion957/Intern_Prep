const express = require('express');
const router = express.Router();
const {
    getQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    markVisited,
    getVisitedQuestions,
    getMySubmissions,
    getMySubmissionsCount,
    transferOwnership,
    getRateLimitInfo,
} = require('../controllers/questionController');
const { protect, admin } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/', getQuestions);
router.get('/:id', getQuestion);

// Protected routes - with rate limiting on create
router.post('/', protect, createRateLimiter('questions'), createQuestion);
router.put('/:id', protect, updateQuestion);
router.delete('/:id', protect, deleteQuestion);

// Visited questions tracking
router.get('/user/visited', protect, getVisitedQuestions);
router.post('/:id/visit', protect, markVisited);

// My submissions
router.get('/user/my-submissions', protect, getMySubmissions);
router.get('/user/my-submissions-count', protect, getMySubmissionsCount);

// Rate limit info
router.get('/user/rate-limits', protect, getRateLimitInfo);

// Admin: Transfer ownership
router.put('/:id/transfer', protect, admin, transferOwnership);

module.exports = router;

