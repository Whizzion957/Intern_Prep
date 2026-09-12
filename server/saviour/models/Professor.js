/**
 * Professor (Saviour)
 *
 * A course is taught by different people in different years, and by several
 * people in the same year across departments. Notes and slides only make sense
 * attached to whoever taught them, so professors are a real entity rather than
 * a free-text field - otherwise "Dr. Sharma", "A Sharma" and "sharma sir" split
 * one person's material into three piles.
 *
 * Students may propose a professor while submitting; it lands unverified and a
 * custodian tidies or merges it during approval.
 */

const mongoose = require('mongoose');

const normalizeName = (name) =>
    String(name || '')
        .toLowerCase()
        .replace(/\b(prof|professor|dr|mr|ms|mrs|sir|maam|ma'am)\b\.?/g, '')
        .replace(/[^a-z]/g, '');

const professorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        // Used for de-duplication; derived from name on save
        normalizedName: {
            type: String,
            index: true,
        },
        department: {
            type: String,
            lowercase: true,
            trim: true,
            default: null,
        },
        // Other spellings people actually type
        aliases: {
            type: [String],
            default: [],
        },
        // False until a custodian or admin confirms the person exists as named
        verified: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'merged'],
            default: 'active',
        },
        mergedInto: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Professor',
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: true }
);

professorSchema.pre('validate', function () {
    this.normalizedName = normalizeName(this.name);
});

// One entry per person per department. Names do repeat across departments.
professorSchema.index({ normalizedName: 1, department: 1 }, { unique: true });

professorSchema.statics.normalizeName = normalizeName;

const Professor = mongoose.model('Professor', professorSchema);

module.exports = Professor;
