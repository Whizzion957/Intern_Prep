/**
 * Activity Log Routes
 * 
 * API endpoints for viewing activity logs (admin only)
 */

const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/logs
 * @desc    Get activity logs with filters
 * @access  Admin only
 */
router.get('/', protect, async (req, res) => {
    try {
        // Only admins can view logs
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const {
            page = 1,
            limit = 50,
            action,
            targetType,
            userId,
            startDate,
            endDate,
            isError,
            search,
        } = req.query;

        // Build query
        const query = {};

        if (action) {
            query.action = action;
        }

        if (targetType) {
            query.targetType = targetType;
        }

        if (userId) {
            query.user = userId;
        }

        if (isError === 'true') {
            query.isError = true;
        }

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search in description
        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { 'userInfo.name': { $regex: search, $options: 'i' } },
                { 'userInfo.enrollmentNumber': { $regex: search, $options: 'i' } },
            ];
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            ActivityLog.countDocuments(query),
        ]);

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ message: 'Failed to fetch logs', error: error.message });
    }
});

/**
 * @route   GET /api/logs/stats
 * @desc    Get log statistics
 * @access  Admin only
 */
router.get('/stats', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalLogs,
            todayLogs,
            errorLogs,
            actionCounts,
            recentErrors,
        ] = await Promise.all([
            ActivityLog.countDocuments(),
            ActivityLog.countDocuments({ createdAt: { $gte: today } }),
            ActivityLog.countDocuments({ isError: true }),
            ActivityLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            ActivityLog.find({ isError: true })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ]);

        res.json({
            totalLogs,
            todayLogs,
            errorLogs,
            actionCounts: actionCounts.map(a => ({ action: a._id, count: a.count })),
            recentErrors,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
    }
});

/**
 * @route   GET /api/logs/actions
 * @desc    Get list of all action types for filtering
 * @access  Admin only
 */
router.get('/actions', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const actions = await ActivityLog.distinct('action');
        res.json({ actions });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch actions', error: error.message });
    }
});

/**
 * @route   GET /api/logs/:id
 * @desc    Get single log entry with full details
 * @access  Admin only
 */
router.get('/:id', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const log = await ActivityLog.findById(req.params.id).lean();

        if (!log) {
            return res.status(404).json({ message: 'Log not found' });
        }

        res.json(log);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch log', error: error.message });
    }
});

module.exports = router;
