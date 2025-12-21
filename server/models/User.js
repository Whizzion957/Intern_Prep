const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        enrollmentNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
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
        email: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'superadmin'],
            default: 'user',
        },
    },
    {
        timestamps: true,
    }
);

// Check if user is superadmin based on enrollment number
userSchema.pre('save', function () {
    if (this.enrollmentNumber === process.env.SUPER_ADMIN_ENROLLMENT) {
        this.role = 'superadmin';
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
