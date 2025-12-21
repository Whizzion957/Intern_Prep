const express = require('express');
const router = express.Router();
const {
    getQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    claimQuestion,
    unclaimQuestion,
    getMyQuestions,
    getMyClaimsCount,
    adminAddClaim,
    adminRemoveClaim,
} = require('../controllers/questionController');
const { protect, admin } = require('../middleware/auth');

router.get('/', getQuestions);
router.get('/my', protect, getMyQuestions);
router.get('/my-claims-count', protect, getMyClaimsCount);
router.get('/:id', getQuestion);
router.post('/', protect, createQuestion);
router.put('/:id', protect, updateQuestion);
router.delete('/:id', protect, deleteQuestion);

// Claim routes (user can only claim/unclaim themselves)
router.post('/:id/claim', protect, claimQuestion);
router.delete('/:id/claim', protect, unclaimQuestion);

// Admin claim routes (can add/remove any user's claim)
router.post('/:id/claim/:userId', protect, admin, adminAddClaim);
router.delete('/:id/claim/:userId', protect, admin, adminRemoveClaim);

module.exports = router;


