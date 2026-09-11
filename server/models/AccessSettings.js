const mongoose = require('mongoose');

// Single document holding the login access rules, editable from the Admin Panel
const accessSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: 'global',
            unique: true,
        },
        // When false, every verified IITR account can log in
        restrictDepartments: {
            type: Boolean,
            default: false,
        },
        // Department codes from the email subdomain, e.g. 'cs' for name@cs.iitr.ac.in
        allowedDepartments: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
        // When true, only these joining years (e.g. 2023) can log in
        restrictYears: {
            type: Boolean,
            default: false,
        },
        allowedYears: [{
            type: Number,
        }],
        // Always allowed, even if their department or year isn't
        allowedEmails: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
        // Never allowed
        blockedEmails: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const AccessSettings = mongoose.model('AccessSettings', accessSettingsSchema);

module.exports = AccessSettings;
