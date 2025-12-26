/**
 * Activity Log Model
 * 
 * Tracks all important activities on the platform for admin monitoring.
 * Logs are automatically deleted after 30 days.
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    // Who performed the action
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // null for anonymous/system actions
    },
    userInfo: {
        name: String,
        enrollmentNumber: String,
        role: String,
    },

    // What action was performed
    action: {
        type: String,
        required: true,
        enum: [
            // Auth actions
            'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
            // Question actions
            'QUESTION_CREATE', 'QUESTION_UPDATE', 'QUESTION_DELETE', 'QUESTION_TRANSFER',
            // Company actions
            'COMPANY_CREATE', 'COMPANY_UPDATE', 'COMPANY_DELETE',
            // Tip actions
            'TIP_CREATE', 'TIP_UPDATE', 'TIP_DELETE',
            // Admin actions
            'USER_ROLE_CHANGE', 'ADMIN_ADD_QUESTION',
            // System actions
            'BACKUP_DAILY', 'BACKUP_MONTHLY', 'SYSTEM_ERROR',
        ],
    },

    // What was the target of the action
    targetType: {
        type: String,
        enum: ['user', 'question', 'company', 'tip', 'system', null],
        default: null,
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    targetInfo: {
        type: mongoose.Schema.Types.Mixed, // Additional info about target
        default: null,
    },

    // Request details
    ip: {
        type: String,
        default: null,
    },
    userAgent: {
        type: String,
        default: null,
    },
    method: {
        type: String,
        default: null,
    },
    path: {
        type: String,
        default: null,
    },

    // For errors - store debug info
    isError: {
        type: Boolean,
        default: false,
    },
    errorDetails: {
        message: String,
        stack: String,
        requestBody: mongoose.Schema.Types.Mixed,
        responseBody: mongoose.Schema.Types.Mixed,
    },

    // Metadata
    description: {
        type: String,
        default: null,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },

    // Timestamp
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30, // Auto-delete after 30 days (TTL index)
    },
});

// Indexes for efficient querying
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });
activityLogSchema.index({ isError: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
