/**
 * Material endpoints (Saviour)
 *
 * Submission is deliberate and human: the student picks a course from the
 * catalog, says which cohort and professor it belongs to, and pastes a public
 * Google Drive link. We store no files - only the link.
 *
 * Approval is routed, not global: it goes to the custodian for that branch and
 * graduating batch, and to the superadmins. A custodian can approve the link as
 * it stands, or re-upload the file into the batch's saviour Drive folder and
 * swap the link before approving.
 */

const Material = require('../models/Material');
const MaterialRequest = require('../models/MaterialRequest');
const Professor = require('../models/Professor');
const { resolveCourse } = require('../services/courseLookup');
const { codeForYear } = require('../services/courseCodes');
const { parseDriveLink, driveUrls, buildSource } = require('../services/drive');
const { serialize } = require('../services/courseView');
const {
    custodianFor,
    canDecide,
    queueScope,
    isSuperadmin,
    guessGraduatingBatch,
} = require('../services/custodians');

/**
 * Resolve the professors named on a submission.
 * Existing ids pass through; a new name is created unverified so a custodian
 * can tidy it during approval rather than blocking the student now.
 */
const resolveProfessors = async (input, department, user) => {
    const entries = Array.isArray(input) ? input : [input].filter(Boolean);
    const ids = [];

    for (const entry of entries) {
        if (!entry) continue;

        if (/^[a-f0-9]{24}$/i.test(entry)) {
            ids.push(entry);
            continue;
        }

        const name = String(entry).trim();
        if (!name) continue;

        const normalized = Professor.normalizeName(name);
        if (!normalized) continue;

        const professor = await Professor.findOneAndUpdate(
            { normalizedName: normalized, department: department || null },
            {
                $setOnInsert: {
                    name,
                    department: department || null,
                    verified: false,
                    createdBy: user._id,
                },
            },
            { upsert: true, new: true }
        );
        ids.push(professor._id);
    }

    return [...new Set(ids.map(String))];
};

/** POST /api/saviour/materials */
const createMaterial = async (req, res) => {
    try {
        const {
            course: courseRef,
            title,
            kind,
            exam,
            year,
            department,
            graduatingBatch,
            professors,
            note,
            url,
            publicConfirmed,
        } = req.body;

        if (!courseRef || !title || !kind || !year) {
            return res.status(400).json({ message: 'course, title, kind and year are required' });
        }

        const course = await resolveCourse(courseRef);
        if (!course) {
            return res.status(400).json({
                message: 'Unknown course. Pick one from the list, or request it be added.',
            });
        }

        const numericYear = Number(year);
        const thisYear = new Date().getFullYear();
        if (!Number.isInteger(numericYear) || numericYear < 1990 || numericYear > thisYear + 1) {
            return res.status(400).json({ message: `Year must be between 1990 and ${thisYear + 1}` });
        }

        // Cohort: whose material this is. Defaults to the submitter's own branch
        // and batch, because that is what people upload nine times out of ten.
        const cohortDepartment = String(department || req.user.department || '').toLowerCase();
        const cohortBatch = Number(graduatingBatch || guessGraduatingBatch(req.user));

        if (!cohortDepartment) {
            return res.status(400).json({ message: 'Say which branch this material is for' });
        }
        if (!Number.isInteger(cohortBatch)) {
            return res.status(400).json({ message: 'Say which graduating batch this material is for' });
        }
        if (!course.isOfferedTo(cohortDepartment)) {
            return res.status(400).json({
                message: `${course.name} is not listed as a ${cohortDepartment.toUpperCase()} course. `
                    + 'Pick the right branch, or ask an admin to add it to the course.',
            });
        }

        const link = parseDriveLink(url);
        if (!link.ok) {
            return res.status(400).json({ message: link.reason });
        }
        if (!publicConfirmed) {
            return res.status(400).json({
                message: 'Set the Drive file to "Anyone with the link" and confirm it, '
                    + 'otherwise nobody but you can open it.',
            });
        }

        // Quizzes and tutorials are kinds of their own now, so a new paper can
        // only belong to one of the three real sittings.
        if (Material.EXAM_KINDS.includes(kind) && !Material.CURRENT_EXAMS.includes(exam)) {
            return res.status(400).json({ message: 'A paper must be from the MTE, the ETE or a practical' });
        }

        const custodian = await custodianFor(cohortDepartment, cohortBatch);

        const material = await Material.create({
            course: course._id,
            // Prefilled from the year, but correctable - the header printed on
            // the paper is the source of truth for what it was called.
            codeAtTime: req.body.codeAtTime || codeForYear(course, numericYear),
            title,
            kind,
            exam: exam || null,
            year: numericYear,
            department: cohortDepartment,
            graduatingBatch: cohortBatch,
            professors: await resolveProfessors(professors, cohortDepartment, req.user),
            note: note || null,
            source: buildSource(link, { origin: 'student', publicConfirmed: true }),
            submittedBy: req.user._id,
            routedTo: custodian?.email || null,
            status: 'pending',
        });

        res.status(201).json({
            material,
            routedTo: custodian
                ? { email: custodian.email, department: custodian.department, graduatingBatch: custodian.graduatingBatch }
                : null,
            message: custodian
                ? `Sent to ${custodian.email} for approval.`
                : 'Sent for approval. No custodian is appointed for that branch and batch yet, '
                  + 'so a superadmin will review it.',
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'That exact Drive file is already filed against this course',
            });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(error.errors)[0].message });
        }
        console.error('[saviour] createMaterial:', error);
        res.status(500).json({ message: 'Could not submit material' });
    }
};

/** GET /api/saviour/materials/mine */
const myMaterials = async (req, res) => {
    try {
        const materials = await Material.find({ submittedBy: req.user._id })
            .populate('course', 'name codes')
            .populate('professors', 'name')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            materials: materials.map((material) => ({
                ...material,
                urls: driveUrls(material.source),
            })),
        });
    } catch (error) {
        console.error('[saviour] myMaterials:', error);
        res.status(500).json({ message: 'Could not load your submissions' });
    }
};

/**
 * GET /api/saviour/approvals
 *
 * The approval panel. A superadmin sees everything; a custodian sees only the
 * branches and batches they are responsible for.
 */
const listApprovals = async (req, res) => {
    try {
        const scope = await queueScope(req.user);
        if (scope === null) {
            return res.json({ materials: [], scope: [], message: 'You are not a custodian for any branch or batch.' });
        }

        const materials = await Material.find({ status: 'pending', ...scope })
            .populate('course', 'name codes offeredTo allDepartments')
            .populate('professors', 'name verified')
            .populate('submittedBy', 'fullName email department')
            .sort({ createdAt: 1 })
            .lean();

        res.json({
            isSuperadmin: isSuperadmin(req.user),
            materials: materials.map((material) => ({
                ...material,
                // The panel embeds the preview, which is also the sharing check:
                // if it doesn't render, the file isn't actually public.
                urls: driveUrls(material.source),
            })),
        });
    } catch (error) {
        console.error('[saviour] listApprovals:', error);
        res.status(500).json({ message: 'Could not load the approval panel' });
    }
};

/** PATCH /api/saviour/materials/:id/decide  { decision, note } */
const decideMaterial = async (req, res) => {
    try {
        const { decision, note } = req.body;
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
        }

        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'No such material' });

        if (!(await canDecide(req.user, material))) {
            return res.status(403).json({
                message: 'Only the custodian for that branch and batch, or a superadmin, can decide this',
            });
        }

        material.status = decision;
        material.decidedBy = req.user._id;
        material.decidedAt = new Date();
        material.decisionNote = note || null;
        await material.save();

        if (decision === 'approved') {
            await MaterialRequest.findOneAndUpdate(
                {
                    course: material.course,
                    kind: material.kind,
                    exam: material.exam,
                    year: material.year,
                    fulfilledAt: null,
                },
                { fulfilledAt: new Date(), fulfilledBy: material._id }
            );
        }

        res.json({ material });
    } catch (error) {
        console.error('[saviour] decideMaterial:', error);
        res.status(500).json({ message: 'Could not record the decision' });
    }
};

/**
 * PATCH /api/saviour/materials/:id/relink  { url }
 *
 * The custodian's other option: download the student's file, re-upload it into
 * the batch's saviour Drive folder, and point the record at that copy instead.
 * The original link is kept in source.replacedFrom so a bad swap is traceable.
 */
const relinkMaterial = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'No such material' });

        if (!(await canDecide(req.user, material))) {
            return res.status(403).json({
                message: 'Only the custodian for that branch and batch, or a superadmin, can relink this',
            });
        }

        const link = parseDriveLink(req.body.url);
        if (!link.ok) return res.status(400).json({ message: link.reason });

        if (link.fileId === material.source.fileId) {
            return res.status(400).json({ message: 'That is the same file it already points at' });
        }

        const previous = material.source.url;
        material.source = {
            ...buildSource(link, {
                origin: 'saviour_drive',
                publicConfirmed: true,
                replacedFrom: previous,
            }),
            replacedBy: req.user._id,
            replacedAt: new Date(),
        };

        // Relinking is the custodian vouching for the file, so approve in the
        // same step unless they explicitly asked to keep it pending.
        if (req.body.approve !== false) {
            material.status = 'approved';
            material.decidedBy = req.user._id;
            material.decidedAt = new Date();
        }

        await material.save();
        res.json({ material, message: 'Pointed at the saviour Drive copy' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Another material already points at that file' });
        }
        console.error('[saviour] relinkMaterial:', error);
        res.status(500).json({ message: 'Could not relink material' });
    }
};

/** PATCH /api/saviour/materials/:id - fix metadata */
const updateMaterial = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'No such material' });

        const mine = material.submittedBy.toString() === req.user._id.toString();
        const decider = await canDecide(req.user, material);

        if (!mine && !decider) {
            return res.status(403).json({ message: 'Not yours to edit' });
        }
        if (mine && !decider && material.status !== 'pending') {
            return res.status(403).json({
                message: 'Already reviewed - ask your custodian, or withdraw it',
            });
        }

        for (const field of ['title', 'kind', 'exam', 'year', 'note', 'codeAtTime']) {
            if (req.body[field] !== undefined) material[field] = req.body[field];
        }

        if (req.body.professors !== undefined) {
            material.professors = await resolveProfessors(
                req.body.professors,
                material.department,
                req.user
            );
        }

        // Re-pointing a misfiled material is a custodian action - it changes
        // the join key, and for department/batch it changes who owns it.
        if (decider) {
            if (req.body.course) {
                const course = await resolveCourse(req.body.course);
                if (!course) return res.status(400).json({ message: 'Unknown course' });
                material.course = course._id;
            }
            if (req.body.department) material.department = req.body.department;
            if (req.body.graduatingBatch) material.graduatingBatch = Number(req.body.graduatingBatch);
        }

        await material.save();
        res.json({ material });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(error.errors)[0].message });
        }
        console.error('[saviour] updateMaterial:', error);
        res.status(500).json({ message: 'Could not update material' });
    }
};

/** DELETE /api/saviour/materials/:id */
const withdrawMaterial = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'No such material' });

        const mine = material.submittedBy.toString() === req.user._id.toString();
        if (!mine && !(await canDecide(req.user, material))) {
            return res.status(403).json({ message: 'Not yours to withdraw' });
        }

        material.status = 'withdrawn';
        await material.save();
        res.json({ message: 'Withdrawn' });
    } catch (error) {
        console.error('[saviour] withdrawMaterial:', error);
        res.status(500).json({ message: 'Could not withdraw material' });
    }
};

/** GET /api/saviour/materials/:id - one material, for the viewer */
const getMaterial = async (req, res) => {
    try {
        const material = await Material.findOneAndUpdate(
            { _id: req.params.id, status: 'approved' },
            { $inc: { viewCount: 1 } },
            { new: true }
        )
            .populate('professors', 'name department')
            .populate('submittedBy', 'fullName department')
            .lean();

        if (!material) return res.status(404).json({ message: 'No such material' });
        res.json({ material: serialize(material, req.user._id) });
    } catch (error) {
        console.error('[saviour] getMaterial:', error);
        res.status(500).json({ message: 'Could not load material' });
    }
};

/** POST /api/saviour/materials/:id/upvote - toggle */
const toggleUpvote = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material || material.status !== 'approved') {
            return res.status(404).json({ message: 'No such material' });
        }

        const userId = req.user._id.toString();
        const index = material.upvotedBy.findIndex((id) => id.toString() === userId);
        if (index === -1) material.upvotedBy.push(req.user._id);
        else material.upvotedBy.splice(index, 1);
        await material.save();

        res.json({ upvotes: material.upvotedBy.length, upvotedByMe: index === -1 });
    } catch (error) {
        console.error('[saviour] toggleUpvote:', error);
        res.status(500).json({ message: 'Could not record the vote' });
    }
};

/** POST /api/saviour/materials/:id/report */
const reportMaterial = async (req, res) => {
    try {
        const { reason, detail } = req.body;
        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'No such material' });

        const already = material.reports.some(
            (report) => report.user && report.user.toString() === req.user._id.toString()
        );
        if (already) return res.json({ message: 'Already reported, thanks' });

        material.reports.push({ user: req.user._id, reason: reason || 'other', detail });
        // 'private' is the common one: the submitter's sharing lapsed. Either
        // way the link no longer works for readers, so flag it the same.
        if (reason === 'broken' || reason === 'private') {
            material.source.reachable = false;
            material.source.checkedAt = new Date();
        }
        await material.save();

        res.json({ message: 'Reported. Your custodian will look at it.' });
    } catch (error) {
        console.error('[saviour] reportMaterial:', error);
        res.status(500).json({ message: 'Could not file the report' });
    }
};

/** POST /api/saviour/materials/request - "this slot is empty, I wanted it" */
const requestMaterial = async (req, res) => {
    try {
        const { course: courseRef, kind, exam, year, note } = req.body;
        if (!courseRef || !kind || !year) {
            return res.status(400).json({ message: 'course, kind and year are required' });
        }
        if (!Material.KINDS.includes(kind)) {
            return res.status(400).json({ message: 'Unknown material kind' });
        }

        const course = await resolveCourse(courseRef);
        if (!course) return res.status(400).json({ message: 'Unknown course' });

        const request = await MaterialRequest.findOneAndUpdate(
            { course: course._id, kind, exam: exam || null, year: Number(year) },
            // The query's equality fields are written on insert automatically,
            // so $addToSet is all this needs.
            { $addToSet: { requestedBy: req.user._id } },
            { new: true, upsert: true }
        );

        // An optional free-text ask, newest first, capped so the doc stays small
        const trimmed = String(note || '').trim();
        if (trimmed) {
            request.notes.unshift({ user: req.user._id, text: trimmed.slice(0, 300), at: new Date() });
            request.notes = request.notes.slice(0, 25);
        }

        request.count = request.requestedBy.length;
        await request.save();

        res.json({ count: request.count });
    } catch (error) {
        console.error('[saviour] requestMaterial:', error);
        res.status(500).json({ message: 'Could not record the request' });
    }
};

/** GET /api/saviour/gaps - the gap board, most-wanted first */
const listGaps = async (req, res) => {
    try {
        const gaps = await MaterialRequest.find({ fulfilledAt: null })
            .populate('course', 'name codes offeredTo allDepartments')
            .sort({ count: -1, updatedAt: -1 })
            .limit(Math.min(Number(req.query.limit) || 50, 200))
            .lean();

        const department = req.query.department;
        res.json({
            gaps: gaps
                .filter((gap) => {
                    if (!gap.course) return false;
                    if (!department) return true;
                    return (
                        gap.course.allDepartments ||
                        (gap.course.offeredTo || []).some((entry) => entry.department === department)
                    );
                })
                .map((gap) => ({
                    _id: gap._id,
                    course: gap.course,
                    codeAtTime: codeForYear(gap.course, gap.year),
                    kind: gap.kind,
                    exam: gap.exam,
                    year: gap.year,
                    count: gap.count,
                })),
        });
    } catch (error) {
        console.error('[saviour] listGaps:', error);
        res.status(500).json({ message: 'Could not load the gap board' });
    }
};

module.exports = {
    createMaterial,
    myMaterials,
    listApprovals,
    decideMaterial,
    relinkMaterial,
    updateMaterial,
    withdrawMaterial,
    getMaterial,
    toggleUpvote,
    reportMaterial,
    requestMaterial,
    listGaps,
};
