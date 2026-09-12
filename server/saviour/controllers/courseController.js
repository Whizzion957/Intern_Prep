/**
 * Course endpoints (Saviour)
 *
 * The catalog is admin-owned. Students read and search it; they file course
 * requests, never courses.
 */

const Course = require('../models/Course');
const CourseRequest = require('../models/CourseRequest');
const { resolveCourse, searchCourses } = require('../services/courseLookup');
const { currentCode, isLegacyCode } = require('../services/courseCodes');
const { buildCourseView } = require('../services/courseView');
const { departmentName } = require('../../services/accessControl');

/** How a course is described in a list: "shared by CSE and MFS", "all branches". */
const scopeLabel = (course) => {
    if (course.allDepartments) return 'All branches';
    const departments = (course.offeredTo || []).map((entry) => entry.department.toUpperCase());
    if (departments.length === 0) return 'Unassigned';
    if (departments.length === 1) return departments[0];
    return departments.join(' · ');
};

/** GET /api/saviour/courses - browse / typeahead */
const listCourses = async (req, res) => {
    try {
        const { q, department, semester, limit } = req.query;
        const courses = await searchCourses({
            query: q,
            department,
            semester,
            limit: Math.min(Number(limit) || 20, 50),
        });

        res.json({
            courses: courses.map((course) => ({
                _id: course._id,
                name: course.name,
                code: currentCode(course),
                allCodes: course.codes.map((entry) => entry.code),
                aliases: course.aliases,
                allDepartments: course.allDepartments,
                offeredTo: course.offeredTo,
                scopeLabel: scopeLabel(course),
                // The semester depends on who is asking - a maths course is
                // semester 1 for one branch and semester 2 for another.
                semester: department
                    ? (course.offeredTo || []).find((entry) => entry.department === department)?.semester
                      ?? course.defaultSemester
                    : course.defaultSemester,
            })),
        });
    } catch (error) {
        console.error('[saviour] listCourses:', error);
        res.status(500).json({ message: 'Could not load courses' });
    }
};

/**
 * GET /api/saviour/courses/:identifier
 *
 * Accepts an _id or ANY code the course has ever used, so a link to the old
 * code keeps working forever.
 */
const getCourse = async (req, res) => {
    try {
        const course = await resolveCourse(req.params.identifier);
        if (!course) return res.status(404).json({ message: 'No such course' });

        res.json({
            course: {
                _id: course._id,
                name: course.name,
                codes: course.codes,
                aliases: course.aliases,
                allDepartments: course.allDepartments,
                offeredTo: course.offeredTo.map((entry) => ({
                    ...entry.toObject?.() ?? entry,
                    label: departmentName(entry.department),
                })),
                defaultSemester: course.defaultSemester,
                owningDepartment: course.owningDepartment,
                credits: course.credits,
                status: course.status,
            },
            canonicalCode: currentCode(course),
            scopeLabel: scopeLabel(course),
            // True when the user arrived via a retired code - the page says
            // "CSN-102 is now CSC-201" instead of silently swapping it.
            viaLegacyCode: isLegacyCode(course, req.params.identifier),
            redirectedFrom: course._resolvedFrom
                ? { _id: course._resolvedFrom._id, code: currentCode(course._resolvedFrom) }
                : null,
        });
    } catch (error) {
        console.error('[saviour] getCourse:', error);
        res.status(500).json({ message: 'Could not load course' });
    }
};

/**
 * GET /api/saviour/courses/:identifier/materials
 *
 * Returns the page pre-grouped: exam papers as a year x exam grid, everything
 * else grouped by (year, department, professor). See services/courseView.js for
 * why those are two different shapes.
 */
const getCourseMaterials = async (req, res) => {
    try {
        const course = await resolveCourse(req.params.identifier);
        if (!course) return res.status(404).json({ message: 'No such course' });

        const view = await buildCourseView(course, req.user._id);
        res.json(view);
    } catch (error) {
        console.error('[saviour] getCourseMaterials:', error);
        res.status(500).json({ message: 'Could not load materials' });
    }
};

/** POST /api/saviour/courses - admin only */
const createCourse = async (req, res) => {
    try {
        const {
            name, codes, aliases, allDepartments, offeredTo,
            defaultSemester, owningDepartment, credits,
        } = req.body;

        if (!name || !Array.isArray(codes) || codes.length === 0) {
            return res.status(400).json({ message: 'name and at least one code are required' });
        }
        if (!allDepartments && (!Array.isArray(offeredTo) || offeredTo.length === 0)) {
            return res.status(400).json({
                message: 'Say which branches take this, or mark it as an all-branches course',
            });
        }

        const course = await Course.create({
            name,
            codes,
            aliases: aliases || [],
            allDepartments: Boolean(allDepartments),
            offeredTo: allDepartments ? [] : offeredTo,
            defaultSemester,
            owningDepartment,
            credits,
            createdBy: req.user._id,
        });

        res.status(201).json({ course });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'One of those codes already belongs to another course' });
        }
        console.error('[saviour] createCourse:', error);
        res.status(500).json({ message: 'Could not create course' });
    }
};

/**
 * PUT /api/saviour/courses/:id - admin only
 *
 * A curriculum rename is recorded here: add the new code with `from: <year>`
 * and `current: true`, set `until` on the old one. No material is touched,
 * because none of them reference the code.
 */
const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'No such course' });

        const fields = [
            'name', 'codes', 'aliases', 'allDepartments', 'offeredTo',
            'defaultSemester', 'owningDepartment', 'credits', 'status', 'mergedInto',
        ];
        for (const field of fields) {
            if (req.body[field] !== undefined) course[field] = req.body[field];
        }

        await course.save();
        res.json({ course });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'That code already belongs to another course' });
        }
        console.error('[saviour] updateCourse:', error);
        res.status(500).json({ message: 'Could not update course' });
    }
};

/** POST /api/saviour/courses/requests - student asks for a missing course */
const requestCourse = async (req, res) => {
    try {
        const { code, name, department, semester, note } = req.body;
        if (!code || !name) {
            return res.status(400).json({ message: 'Course code and name are required' });
        }

        const request = await CourseRequest.create({
            code,
            name,
            department: department || req.user.department,
            semester,
            note,
            requestedBy: req.user._id,
        });

        res.status(201).json({ request });
    } catch (error) {
        console.error('[saviour] requestCourse:', error);
        res.status(500).json({ message: 'Could not file the request' });
    }
};

/** GET /api/saviour/courses/requests - admin only */
const listCourseRequests = async (req, res) => {
    try {
        const requests = await CourseRequest.find({ status: req.query.status || 'pending' })
            .populate('requestedBy', 'fullName email department')
            .sort({ createdAt: 1 })
            .lean();
        res.json({ requests });
    } catch (error) {
        console.error('[saviour] listCourseRequests:', error);
        res.status(500).json({ message: 'Could not load requests' });
    }
};

/**
 * GET /api/saviour/courses/requests/mine
 *
 * A student's own course requests, so a rejection reaches the person who asked
 * rather than dying in the admin queue.
 */
const myCourseRequests = async (req, res) => {
    try {
        const requests = await CourseRequest.find({ requestedBy: req.user._id })
            .populate('resultingCourse', 'name codes')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ requests });
    } catch (error) {
        console.error('[saviour] myCourseRequests:', error);
        res.status(500).json({ message: 'Could not load your course requests' });
    }
};

/**
 * PATCH /api/saviour/courses/requests/:id - admin only
 * Body: { decision: 'accepted' | 'rejected', course?: {...}, note }
 *
 * Accepting is what actually creates the catalog entry, so the admin can
 * correct the student's guess on the way through: a request only carries a
 * code, a name and one branch, but a real course needs to say whether it is
 * institute-wide or shared, and which semester it sits in for each branch.
 * Anything not supplied falls back to what the student filed.
 */
const decideCourseRequest = async (req, res) => {
    try {
        const { decision, note } = req.body;
        if (!['accepted', 'rejected'].includes(decision)) {
            return res.status(400).json({ message: "decision must be 'accepted' or 'rejected'" });
        }

        const request = await CourseRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'No such request' });
        if (request.status !== 'pending') {
            return res.status(409).json({ message: `Already ${request.status}` });
        }

        if (decision === 'rejected') {
            request.status = 'rejected';
            request.reviewedBy = req.user._id;
            request.reviewNote = note || null;
            await request.save();
            return res.json({ request, message: 'Rejected' });
        }

        const payload = req.body.course || {};
        const allDepartments = Boolean(payload.allDepartments);

        // Fall back to the one branch and semester the student named
        const offeredTo = allDepartments
            ? []
            : payload.offeredTo?.length
                ? payload.offeredTo
                : [{
                    department: (request.department || req.user.department || '').toLowerCase(),
                    semester: request.semester || null,
                }];

        if (!allDepartments && !offeredTo[0]?.department) {
            return res.status(400).json({
                message: 'Say which branches take this course, or mark it as all-branches',
            });
        }

        const course = await Course.create({
            name: payload.name || request.name,
            codes: payload.codes?.length
                ? payload.codes
                : [{ code: request.code, current: true }],
            aliases: payload.aliases || [],
            allDepartments,
            offeredTo,
            defaultSemester: payload.defaultSemester ?? request.semester ?? null,
            owningDepartment: payload.owningDepartment || offeredTo[0]?.department || null,
            credits: payload.credits ?? null,
            createdBy: req.user._id,
        });

        request.status = 'accepted';
        request.resultingCourse = course._id;
        request.reviewedBy = req.user._id;
        request.reviewNote = note || null;
        await request.save();

        res.json({ request, course, message: `${currentCode(course)} added to the catalog` });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'That code already belongs to another course - the catalog may already have it',
            });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(error.errors)[0].message });
        }
        console.error('[saviour] decideCourseRequest:', error);
        res.status(500).json({ message: 'Could not act on the request' });
    }
};

module.exports = {
    myCourseRequests,
    listCourses,
    getCourse,
    getCourseMaterials,
    createCourse,
    updateCourse,
    requestCourse,
    listCourseRequests,
    decideCourseRequest,
};
