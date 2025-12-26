/**
 * Activity Logger Service
 * 
 * Centralized logging service for tracking all platform activities.
 * Use this to log actions from controllers.
 */

const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity
 * @param {Object} options - Logging options
 * @param {Object} options.user - User object (from req.user)
 * @param {string} options.action - Action type (e.g., 'QUESTION_CREATE')
 * @param {string} options.targetType - Target type ('question', 'company', etc.)
 * @param {string} options.targetId - Target document ID
 * @param {Object} options.targetInfo - Additional target info
 * @param {Object} options.req - Express request object (for IP, user agent)
 * @param {string} options.description - Human-readable description
 * @param {Object} options.metadata - Additional metadata
 * @param {boolean} options.isError - Whether this is an error log
 * @param {Object} options.errorDetails - Error details for debugging
 */
const logActivity = async (options) => {
    try {
        const {
            user = null,
            action,
            targetType = null,
            targetId = null,
            targetInfo = null,
            req = null,
            description = null,
            metadata = null,
            isError = false,
            errorDetails = null,
        } = options;

        const logEntry = {
            user: user?._id || null,
            userInfo: user ? {
                name: user.fullName || user.name,
                enrollmentNumber: user.enrollmentNumber,
                role: user.role,
            } : null,
            action,
            targetType,
            targetId,
            targetInfo,
            description,
            metadata,
            isError,
            errorDetails,
        };

        // Extract request info
        if (req) {
            logEntry.ip = req.ip ||
                req.headers['x-forwarded-for']?.split(',')[0] ||
                req.connection?.remoteAddress ||
                'unknown';
            logEntry.userAgent = req.headers['user-agent']?.substring(0, 500) || null;
            logEntry.method = req.method;
            logEntry.path = req.originalUrl?.substring(0, 500);
        }

        await ActivityLog.create(logEntry);
    } catch (error) {
        // Don't let logging errors break the app
        console.error('Failed to log activity:', error.message);
    }
};

/**
 * Log user authentication
 */
const logAuth = async (user, action, req, success = true) => {
    await logActivity({
        user: success ? user : null,
        action: success ? action : 'LOGIN_FAILED',
        targetType: 'user',
        targetId: user?._id,
        targetInfo: {
            name: user?.fullName,
            enrollmentNumber: user?.enrollmentNumber,
        },
        req,
        description: success
            ? `${user?.fullName} ${action.toLowerCase()}`
            : `Failed login attempt`,
    });
};

/**
 * Log question action
 */
const logQuestion = async (user, action, question, req, metadata = null) => {
    await logActivity({
        user,
        action,
        targetType: 'question',
        targetId: question?._id,
        targetInfo: {
            questionNumber: question?.questionNumber,
            company: question?.company?.name || question?.company,
        },
        req,
        description: `${user?.fullName} ${action.replace('QUESTION_', '').toLowerCase()} question #${question?.questionNumber}`,
        metadata,
    });
};

/**
 * Log company action
 */
const logCompany = async (user, action, company, req, metadata = null) => {
    await logActivity({
        user,
        action,
        targetType: 'company',
        targetId: company?._id,
        targetInfo: { name: company?.name },
        req,
        description: `${user?.fullName} ${action.replace('COMPANY_', '').toLowerCase()} company "${company?.name}"`,
        metadata,
    });
};

/**
 * Log tip action
 */
const logTip = async (user, action, tip, company, req) => {
    await logActivity({
        user,
        action,
        targetType: 'tip',
        targetId: tip?._id,
        targetInfo: {
            companyId: company?._id,
            companyName: company?.name,
        },
        req,
        description: `${user?.fullName} ${action.replace('TIP_', '').toLowerCase()} tip for "${company?.name}"`,
    });
};

/**
 * Log admin action
 */
const logAdmin = async (admin, action, target, targetType, req, metadata = null) => {
    await logActivity({
        user: admin,
        action,
        targetType,
        targetId: target?._id,
        targetInfo: {
            name: target?.fullName || target?.name,
            enrollmentNumber: target?.enrollmentNumber,
        },
        req,
        description: `Admin ${admin?.fullName} performed ${action}`,
        metadata,
    });
};

/**
 * Log system error with debug info
 */
const logError = async (action, error, req = null, requestBody = null) => {
    await logActivity({
        action,
        targetType: 'system',
        isError: true,
        errorDetails: {
            message: error.message,
            stack: error.stack?.substring(0, 2000),
            requestBody: requestBody ? JSON.stringify(requestBody).substring(0, 2000) : null,
        },
        req,
        description: `System error: ${error.message}`,
    });
};

/**
 * Log backup action
 */
const logBackup = async (type, success, stats = null, error = null) => {
    await logActivity({
        action: type === 'daily' ? 'BACKUP_DAILY' : 'BACKUP_MONTHLY',
        targetType: 'system',
        isError: !success,
        description: success
            ? `${type} backup completed successfully`
            : `${type} backup failed`,
        metadata: success ? stats : null,
        errorDetails: error ? { message: error.message, stack: error.stack } : null,
    });
};

module.exports = {
    logActivity,
    logAuth,
    logQuestion,
    logCompany,
    logTip,
    logAdmin,
    logError,
    logBackup,
};
