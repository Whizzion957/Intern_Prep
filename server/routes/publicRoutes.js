/**
 * Public Routes
 *
 * Counts shown on the login page. No auth, no personal data - totals only.
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const { Company } = require('../models/Company');
const { PLACEHOLDER_EMAIL } = require('../services/accessControl');

const CACHE_MS = 5 * 60 * 1000;
let cached = null;
let cachedAt = 0;

router.get('/stats', async (req, res) => {
    try {
        if (cached && Date.now() - cachedAt < CACHE_MS) {
            return res.json(cached);
        }

        const [questions, companies, students] = await Promise.all([
            Question.countDocuments(),
            Company.countDocuments(),
            // Real accounts only: skip seeded placeholders and the SYSTEM user
            User.countDocuments({
                email: { $not: PLACEHOLDER_EMAIL },
                enrollmentNumber: { $ne: 'SYSTEM' },
            }),
        ]);

        cached = { questions, companies, students };
        cachedAt = Date.now();
        res.json(cached);
    } catch (error) {
        console.error('Public stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
