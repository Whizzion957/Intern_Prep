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

// Create text index for full-text search on question and suggestions
questionSchema.index({ question: 'text', suggestions: 'text' });

// Compound index for common queries
questionSchema.index({ company: 1, year: -1 });
questionSchema.index({ company: 1, questionNumber: 1 });
questionSchema.index({ submittedBy: 1, createdAt: -1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
