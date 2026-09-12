/**
 * Course (Saviour)
 *
 * The stable identity for an academic course. Two things change around it and
 * neither is allowed to move the identity:
 *
 * 1. Codes change (CSN-102 -> CSC-201 after the curriculum revision), so a
 *    course carries a LIST of codes, each valid for a range of years.
 *
 * 2. Who takes it changes. A course is institute-wide (MAN-001 Maths I), or
 *    shared by a few departments, or specific to one - and the semester it
 *    falls in differs per department. `allDepartments` + `offeredTo` covers all
 *    three cases without a separate model per case.
 *
 * Materials reference the course by _id and never by code, so a rename is a
 * one-line catalog edit and nothing else moves.
 *
 * Only admins create courses. Students pick from this catalog and file a
 * CourseRequest when something is missing.
 */

const mongoose = require('mongoose');
const { normalizeCode } = require('../services/courseCodes');

const courseCodeSchema = new mongoose.Schema(
    {
        // Display form, as printed on the paper, e.g. "CSN-102"
        code: { type: String, required: true, trim: true, uppercase: true },
        // Inclusive year range this code was in use. null = open ended.
        from: { type: Number, default: null },
        until: { type: Number, default: null },
        // Exactly one code per course is current
        current: { type: Boolean, default: false },
    },
    { _id: false }
);

const offeringSchema = new mongoose.Schema(
    {
        department: { type: String, required: true, lowercase: true, trim: true },
        // The same course sits in different semesters for different branches
        semester: { type: Number, min: 1, max: 10, default: null },
    },
    { _id: false }
);

const courseSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },

        // Institute-wide course (first year maths, humanities electives).
        // When true, offeredTo is ignored for "who takes this".
        allDepartments: { type: Boolean, default: false },

        // Which branches take it, and in which semester for each.
        // One entry = a single-department course; several = a shared one.
        offeredTo: { type: [offeringSchema], default: [] },

        // Used when allDepartments is true and there is nothing per-branch to say
        defaultSemester: { type: Number, min: 1, max: 10, default: null },

        // The department that runs the course (owns the syllabus). Advisory -
        // it is who to ask, not who takes it.
        owningDepartment: { type: String, lowercase: true, trim: true, default: null },

        credits: { type: Number, default: null },

        codes: {
            type: [courseCodeSchema],
            validate: {
                validator: (codes) => Array.isArray(codes) && codes.length > 0,
                message: 'A course needs at least one code',
            },
        },
        // Derived from codes[] on save; what search and uniqueness run against
        normalizedCodes: { type: [String], default: [] },
        // Informal names students actually type: "DSA", "Thermo"
        aliases: { type: [String], default: [] },

        status: {
            type: String,
            enum: ['active', 'merged', 'retired'],
            default: 'active',
        },
        mergedInto: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
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

// Keep normalizedCodes in sync and make sure exactly one code is current
courseSchema.pre('validate', function () {
    if (Array.isArray(this.codes)) {
        this.normalizedCodes = [
            ...new Set(this.codes.map((entry) => normalizeCode(entry.code)).filter(Boolean)),
        ];

        const currents = this.codes.filter((entry) => entry.current);
        if (currents.length === 0 && this.codes.length > 0) {
            // Newest by `from` wins when nobody was marked current
            const newest = [...this.codes].sort((a, b) => (b.from || 0) - (a.from || 0))[0];
            newest.current = true;
        } else if (currents.length > 1) {
            const keep = currents.sort((a, b) => (b.from || 0) - (a.from || 0))[0];
            this.codes.forEach((entry) => {
                entry.current = entry === keep;
            });
        }
    }

    if (Array.isArray(this.aliases)) {
        this.aliases = [...new Set(this.aliases.map((a) => String(a).trim()).filter(Boolean))];
    }

    // An institute-wide course listing every department is just noise
    if (this.allDepartments) this.offeredTo = [];
});

/** Which departments take this course; empty array means "everyone". */
courseSchema.methods.departments = function () {
    return this.allDepartments ? [] : this.offeredTo.map((entry) => entry.department);
};

/** The semester this course falls in for a given branch. */
courseSchema.methods.semesterFor = function (department) {
    if (this.allDepartments) return this.defaultSemester;
    const match = this.offeredTo.find((entry) => entry.department === department);
    return match ? match.semester : this.defaultSemester;
};

/** True when this course is taken by the given branch. */
courseSchema.methods.isOfferedTo = function (department) {
    if (this.allDepartments) return true;
    return this.offeredTo.some((entry) => entry.department === department);
};

// A code belongs to exactly one course, platform-wide
courseSchema.index({ normalizedCodes: 1 }, { unique: true, sparse: true });
courseSchema.index({ 'offeredTo.department': 1, 'offeredTo.semester': 1 });
courseSchema.index({ allDepartments: 1 });
courseSchema.index({ name: 'text', aliases: 'text' });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
