/**
 * MaterialRequest (Saviour)
 *
 * The gap board. When someone opens a course page and the slot they wanted is
 * empty, they press "request" and it is recorded here. The count is what makes
 * a hole visible ("2023 end term - 23 people looked for this") and is what the
 * post-exam nudge mails are addressed from.
 *
 * One document per (course, kind, exam, year) slot; requesters accumulate.
 */

const mongoose = require('mongoose');

const materialRequestSchema = new mongoose.Schema(
    {
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        kind: { type: String, required: true },
        exam: { type: String, default: null },
        year: { type: Number, required: true },

        requestedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        count: { type: Number, default: 0 },
        // Free-text asks attached to this slot, newest first, capped so the
        // document stays small. Optional: most requests are a bare "+1".
        notes: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                text: { type: String, trim: true, maxlength: 300 },
                at: { type: Date, default: Date.now },
            },
        ],
        // Set once a matching material is approved, so the slot stops nagging
        fulfilledAt: { type: Date, default: null },
        fulfilledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Material',
            default: null,
        },
    },
    { timestamps: true }
);

materialRequestSchema.index(
    { course: 1, kind: 1, exam: 1, year: 1 },
    { unique: true }
);
materialRequestSchema.index({ fulfilledAt: 1, count: -1 });

const MaterialRequest = mongoose.model('MaterialRequest', materialRequestSchema);

module.exports = MaterialRequest;
