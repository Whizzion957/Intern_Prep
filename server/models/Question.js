const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Made optional - questions are anonymous
            default: null,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
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
        // Users who claim to be related to this question
        claimedBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            claimedAt: {
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
questionSchema.index({ submittedBy: 1, createdAt: -1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;

