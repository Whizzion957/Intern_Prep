const mongoose = require('mongoose');

const companyTipSchema = new mongoose.Schema(
    {
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        parentTip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CompanyTip',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
companyTipSchema.index({ company: 1, createdAt: -1 });
companyTipSchema.index({ parentTip: 1 });

const CompanyTip = mongoose.model('CompanyTip', companyTipSchema);

module.exports = CompanyTip;
