/**
 * CourseRequest (Saviour)
 *
 * Students cannot create courses - the catalog is admin-owned so the course
 * list stays clean and codes stay unique. When someone can't find their course
 * in the typeahead, this is what they file instead.
 */

const mongoose = require('mongoose');

const courseRequestSchema = new mongoose.Schema(
    {
        code: { type: String, trim: true, uppercase: true, required: true },
        name: { type: String, trim: true, required: true },
        department: { type: String, lowercase: true, trim: true, default: null },
        semester: { type: Number, default: null },
        note: { type: String, trim: true, maxlength: 300, default: null },

        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
        },
        // Set when an admin turns the request into a real catalog entry
        resultingCourse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            default: null,
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewNote: { type: String, trim: true, default: null },
    },
    { timestamps: true }
);

courseRequestSchema.index({ status: 1, createdAt: 1 });

const CourseRequest = mongoose.model('CourseRequest', courseRequestSchema);

module.exports = CourseRequest;
