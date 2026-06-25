const express = require('express');
const router = express.Router();
const {
    getResources,
    getCategories,
    getResource,
    createResource,
    updateResource,
    deleteResource,
} = require('../controllers/resourceController');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/', getResources);
router.get('/categories', getCategories);
router.get('/:id', getResource);

// Protected routes - with rate limiting on create
router.post('/', protect, createRateLimiter('resources'), createResource);
router.put('/:id', protect, updateResource);
router.delete('/:id', protect, deleteResource);

module.exports = router;
