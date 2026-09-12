/**
 * Material (Saviour)
 *
 * One artifact for one course: a past paper, notes, slides, a book, a solution.
 * Always a public Google Drive link - we store no bytes, so nothing here grows
 * the database beyond a few hundred characters.
 *
 * Two dimensions decide who approves it and where it shows up:
 *
 *   department + graduatingBatch  the cohort it belongs to. This routes the
 *                                 submission to that branch/batch's custodian.
 *   professors                    who taught it. Notes and slides are only
 *                                 useful next to the person who gave them, and
 *                                 one course has several professors in a year
 *                                 and different ones across years.
 *
 * A past paper is usually common to everyone who sat the exam, so its
 * professors list may be empty; notes almost never are.
 */

const mongoose = require('mongoose');

const KINDS = ['past_paper', 'solution', 'notes', 'slides', 'book', 'cheatsheet', 'other'];
const EXAMS = ['mid', 'end', 'quiz', 'tutorial', 'practical'];
// Kinds that are pinned to a sitting of an exam rather than to a lecturer
const EXAM_KINDS = ['past_paper', 'solution'];

const sourceSchema = new mongoose.Schema(
    {
        // Google Drive file id - everything else is derived from it
        fileId: { type: String, required: true, trim: true },
        // 'file' for Drive files, or 'document' | 'spreadsheets' | 'presentation'
        docType: { type: String, default: 'file' },
        // Canonical view URL, kept denormalized for cheap reads
        url: { type: String, required: true, trim: true },

        // 'student'       - still in the submitter's personal Drive
        // 'saviour_drive' - the custodian re-uploaded it into the batch folder,
        //                   so it survives the submitter graduating
        origin: {
            type: String,
            enum: ['student', 'saviour_drive'],
            default: 'student',
        },
        // The submitter ticked "shared with anyone with the link". Cheap to
        // claim, but the approval panel previews the file, so a lie is caught.
        publicConfirmed: { type: Boolean, default: false },
        // The link this replaced when a custodian moved it into the saviour
        // Drive - kept so a bad swap can be traced
        replacedFrom: { type: String, default: null },
        replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        replacedAt: { type: Date, default: null },

        // Link health, set by user reports
        reachable: { type: Boolean, default: null },
        checkedAt: { type: Date, default: null },
    },
    { _id: false }
);

const materialSchema = new mongoose.Schema(
    {
        // The join key. Never a code string - codes change, this does not.
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            index: true,
        },
        // What the paper itself is labelled with, e.g. "CSN-102" on a 2023 paper
        // even though the course is now CSC-201. Display only.
        codeAtTime: { type: String, trim: true, uppercase: true, default: null },

        title: { type: String, required: true, trim: true, maxlength: 200 },
        kind: { type: String, enum: KINDS, required: true },
        // Required for past_paper and solution, null for everything else
        exam: { type: String, enum: [...EXAMS, null], default: null },
        year: { type: Number, required: true },

        // --- cohort: decides the approver and the filters -------------------
        department: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        graduatingBatch: { type: Number, required: true, index: true },

        // --- who taught it --------------------------------------------------
        professors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Professor' }],

        note: { type: String, trim: true, maxlength: 500, default: null },
        source: { type: sourceSchema, required: true },

        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'withdrawn'],
            default: 'pending',
            index: true,
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // Snapshot of who this was routed to when it was submitted, so the
        // trail survives a custodian being replaced later
        routedTo: { type: String, lowercase: true, trim: true, default: null },

        decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        decidedAt: { type: Date, default: null },
        decisionNote: { type: String, trim: true, default: null },

        upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        reports: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                reason: { type: String, enum: ['broken', 'private', 'wrong_course', 'wrong_year', 'other'] },
                detail: { type: String, trim: true, maxlength: 300 },
                at: { type: Date, default: Date.now },
            },
        ],
        viewCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// A past paper must say which exam it is; other kinds must not pretend to
materialSchema.pre('validate', function () {
    if (EXAM_KINDS.includes(this.kind) && !this.exam) {
        this.invalidate('exam', 'Past papers and solutions must say which exam they are from');
    }
    if (!EXAM_KINDS.includes(this.kind)) {
        this.exam = null;
    }
});

// The course page
materialSchema.index({ course: 1, status: 1, year: -1 });
// Grouping by who taught it
materialSchema.index({ course: 1, status: 1, professors: 1 });
// The approval panel, scoped to a custodian's branch and batch
materialSchema.index({ status: 1, department: 1, graduatingBatch: 1, createdAt: 1 });
// The same Drive file cannot be filed twice against one course
materialSchema.index(
    { course: 1, 'source.fileId': 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['pending', 'approved'] } } }
);

materialSchema.statics.KINDS = KINDS;
materialSchema.statics.EXAMS = EXAMS;
materialSchema.statics.EXAM_KINDS = EXAM_KINDS;

const Material = mongoose.model('Material', materialSchema);

module.exports = Material;
