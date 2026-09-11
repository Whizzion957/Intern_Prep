const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        // Only set for users who joined via Channel-i (or were seeded);
        // Google sign-in doesn't provide it. Unique index is defined below.
        enrollmentNumber: {
            type: String,
        },
        fullName: {
            type: String,
            required: true,
        },
        displayPicture: {
            type: String,
            default: null,
        },
        branch: {
            type: String,
            required: true,
        },
        // Login identity (Google account email)
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        // Department code from the email subdomain, e.g. 'cs'
        department: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'superadmin'],
            default: 'user',
        },
        // Track visited questions for green tick feature
        visitedQuestions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
        }],
    },
    {
        timestamps: true,
    }
);

// Unique only among users that have an enrollment number
userSchema.index(
    { enrollmentNumber: 1 },
    { unique: true, partialFilterExpression: { enrollmentNumber: { $type: 'string' } } }
);

// Check if user is superadmin based on enrollment number or email
const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

userSchema.pre('save', function () {
    if (
        (this.enrollmentNumber && this.enrollmentNumber === process.env.SUPER_ADMIN_ENROLLMENT) ||
        superAdminEmails.includes(this.email)
    ) {
        this.role = 'superadmin';
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
