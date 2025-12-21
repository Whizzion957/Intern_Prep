const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        logo: {
            type: String,
            default: null,
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Create text index for search
companySchema.index({ name: 'text' });

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
