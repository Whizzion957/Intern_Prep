const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            default: null,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
        },
        // Auto-generated question number per company (e.g., Google #1, #2, #3)
        questionNumber: {
            type: Number,
            default: null,
        },
        type: {
            type: String,
            enum: ['interview', 'oa', 'others'],
            required: true,
        },
        otherType: {
            type: String,
            default: null,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
        },
        question: {
            type: String,
            required: true,
        },
        suggestions: {
            type: String,
            default: null,
        },
        // Hidden trail of past owners (for admin reference)
        ownershipHistory: [{
            previousOwner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            transferredTo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            transferredBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            date: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    {
        timestamps: true,
    }
);

// ===========================================
// DATABASE INDEXES
// ===========================================
// These speed up common queries significantly:
//
// company + year: For listing questions per company sorted by year
// company + questionNumber: For question number lookups (e.g., Google #5)
// submittedBy + createdAt: For "My Submissions" page
// type + createdAt: For filtering by interview/oa type
// createdAt: For sorting all questions by date

questionSchema.index({ company: 1, year: -1 });           // Questions by company
questionSchema.index({ company: 1, questionNumber: 1 });   // Question number lookup
questionSchema.index({ submittedBy: 1, createdAt: -1 });  // User's submissions
questionSchema.index({ type: 1, createdAt: -1 });         // Filter by type
questionSchema.index({ createdAt: -1 });                   // Recent questions

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
