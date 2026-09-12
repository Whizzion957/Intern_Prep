/**
 * Custodian (Saviour)
 *
 * One student is responsible for one branch of one graduating batch - the
 * person who already owns that batch's saviour Drive folder in practice. Every
 * submission for (department, graduatingBatch) goes to them and to the
 * superadmins for approval.
 *
 * The key is the EMAIL, not a user id, so a custodian can be appointed before
 * they have ever signed in. `user` is filled in lazily the first time they are
 * seen, purely so the panel can show a name.
 */

const mongoose = require('mongoose');

const custodianSchema = new mongoose.Schema(
    {
        // Department code, same vocabulary as services/accessControl.js ('cs', 'ee')
        department: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        // The batch they look after, by graduation year, e.g. 2027
        graduatingBatch: {
            type: Number,
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        // Link to the batch's saviour folder, shown in the approval panel so the
        // custodian knows exactly where to re-upload a file
        driveFolderUrl: {
            type: String,
            trim: true,
            default: null,
        },
        active: {
            type: Boolean,
            default: true,
        },
        note: { type: String, trim: true, default: null },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: true }
);

// One custodian per branch per batch
custodianSchema.index({ department: 1, graduatingBatch: 1 }, { unique: true });
custodianSchema.index({ email: 1 });

const Custodian = mongoose.model('Custodian', custodianSchema);

module.exports = Custodian;
