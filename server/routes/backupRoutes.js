/**
 * Backup Routes
 * 
 * API endpoints for the backup system.
 * These should be protected and only accessible via:
 * - Vercel Cron (with CRON_SECRET)
 * - Superadmin users
 */

const express = require('express');
const router = express.Router();
const { runBackup, listBackups } = require('../services/backup');
const { protect, superAdmin } = require('../middleware/auth');

// Environment variables for backup
const SOURCE_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const BACKUP_URI = process.env.BACKUP_MONGO_URI;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Verify cron secret for automated jobs
 */
const verifyCronSecret = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check for cron secret
    if (authHeader === `Bearer ${CRON_SECRET}`) {
        return next();
    }

    // Otherwise require superadmin auth
    return protect(req, res, () => {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({ message: 'Superadmin access required' });
        }
        next();
    });
};

/**
 * @route   POST /api/backup/daily
 * @desc    Run daily backup (called by Vercel Cron)
 * @access  Cron Secret or Superadmin
 */
router.post('/daily', verifyCronSecret, async (req, res) => {
    try {
        if (!BACKUP_URI) {
            return res.status(500).json({
                error: 'Backup not configured',
                message: 'BACKUP_MONGO_URI environment variable is not set'
            });
        }

        const result = await runBackup(SOURCE_URI, BACKUP_URI, 'daily');
        res.json({
            success: true,
            message: result.skipped
                ? `Daily backup for ${result.identifier} already exists`
                : 'Daily backup completed',
            ...result,
        });
    } catch (error) {
        console.error('Daily backup error:', error);
        res.status(500).json({
            error: 'Backup failed',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/backup/monthly
 * @desc    Run monthly backup (called by Vercel Cron)
 * @access  Cron Secret or Superadmin
 */
router.post('/monthly', verifyCronSecret, async (req, res) => {
    try {
        if (!BACKUP_URI) {
            return res.status(500).json({
                error: 'Backup not configured',
                message: 'BACKUP_MONGO_URI environment variable is not set'
            });
        }

        const result = await runBackup(SOURCE_URI, BACKUP_URI, 'monthly');
        res.json({
            success: true,
            message: result.skipped
                ? `Monthly backup for ${result.identifier} already exists`
                : 'Monthly backup completed',
            ...result,
        });
    } catch (error) {
        console.error('Monthly backup error:', error);
        res.status(500).json({
            error: 'Backup failed',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/backup/list
 * @desc    List all backups
 * @access  Superadmin only
 */
router.get('/list', protect, async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({ message: 'Superadmin access required' });
        }

        if (!BACKUP_URI) {
            return res.status(500).json({
                error: 'Backup not configured',
                message: 'BACKUP_MONGO_URI environment variable is not set'
            });
        }

        const backups = await listBackups(BACKUP_URI);

        res.json({
            count: backups.length,
            backups: backups.map(b => ({
                id: b._id,
                type: b.type,
                date: b.date,
                month: b.month,
                createdAt: b.createdAt,
                stats: b.stats,
            })),
        });
    } catch (error) {
        console.error('List backups error:', error);
        res.status(500).json({
            error: 'Failed to list backups',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/backup/status
 * @desc    Get backup system status
 * @access  Superadmin only
 */
router.get('/status', protect, async (req, res) => {
    try {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({ message: 'Superadmin access required' });
        }

        res.json({
            configured: !!BACKUP_URI,
            sourceConfigured: !!SOURCE_URI,
            cronSecretConfigured: !!CRON_SECRET,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
