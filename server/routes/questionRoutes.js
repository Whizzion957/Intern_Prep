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
} = require('../controllers/questionController');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', getQuestions);
router.get('/:id', getQuestion);

// Protected routes
router.post('/', protect, createQuestion);
router.put('/:id', protect, updateQuestion);
router.delete('/:id', protect, deleteQuestion);

// Visited questions tracking
router.get('/user/visited', protect, getVisitedQuestions);
router.post('/:id/visit', protect, markVisited);

// My submissions
router.get('/user/my-submissions', protect, getMySubmissions);
router.get('/user/my-submissions-count', protect, getMySubmissionsCount);

// Admin: Transfer ownership
router.put('/:id/transfer', protect, admin, transferOwnership);

module.exports = router;
