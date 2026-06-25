const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster querying
resourceSchema.index({ category: 1, createdAt: -1 }); // Filter by category
resourceSchema.index({ submittedBy: 1, createdAt: -1 }); // User's resources
resourceSchema.index({ createdAt: -1 }); // Recent resources

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
