/**
 * Course page assembly (Saviour)
 *
 * A course page has to answer two different questions, and they want two
 * different shapes - which is why this builds two structures rather than one
 * flat list.
 *
 *   "Give me the 2023 end term paper."
 *       Exam papers are pinned to a sitting, not to a lecturer. Everyone who
 *       sat that exam wrote the same paper. So they belong in a year x exam
 *       grid, where an empty cell is as informative as a full one.
 *
 *   "Give me notes for the way it is being taught to me."
 *       Notes, slides and cheatsheets are worthless detached from the person
 *       who gave them - a course has several professors in one year (one per
 *       department cohort) and different ones across years. So they group by
 *       (year, department, professor), newest first.
 *
 * Everything is returned pre-grouped so the client renders rather than reduces.
 */

const Material = require('../models/Material');
const MaterialRequest = require('../models/MaterialRequest');
const { codeForYear } = require('./courseCodes');
const { driveUrls } = require('./drive');

const EXAM_KINDS = Material.EXAM_KINDS;
// Columns of the paper grid. 'practical' joined mid and end when quizzes and
// tutorials became kinds of their own.
const PAPER_EXAMS = ['mid', 'end', 'practical'];

/** Public shape of one material, with the three Drive URLs the client needs. */
const serialize = (material, viewerId) => {
    const urls = driveUrls(material.source);
    return {
        _id: material._id,
        title: material.title,
        kind: material.kind,
        exam: material.exam,
        year: material.year,
        codeAtTime: material.codeAtTime,
        department: material.department,
        graduatingBatch: material.graduatingBatch,
        professors: material.professors || [],
        note: material.note,
        // Rendered by the in-app viewer; download is the escape hatch
        view: urls.view,
        preview: urls.preview,
        download: urls.download,
        // 'saviour_drive' means a custodian re-uploaded it into the batch folder,
        // so it outlives the student who submitted it. Worth showing.
        origin: material.source.origin,
        reachable: material.source.reachable,
        submittedBy: material.submittedBy,
        upvotes: material.upvotedBy?.length || 0,
        upvotedByMe: (material.upvotedBy || []).some((id) => String(id) === String(viewerId)),
        viewCount: material.viewCount,
        createdAt: material.createdAt,
    };
};

/** Stable key for a (year, department, professor set) teaching group. */
const groupKey = (material) => {
    const profs = (material.professors || [])
        .map((prof) => String(prof._id || prof))
        .sort()
        .join('+');
    return `${material.year}|${material.department}|${profs || 'unattributed'}`;
};

/**
 * Build the whole page payload for one course.
 * `course` is a hydrated Course document; `viewerId` marks the viewer's upvotes.
 */
const buildCourseView = async (course, viewerId) => {
    const materials = await Material.find({ course: course._id, status: 'approved' })
        .populate('professors', 'name department verified')
        .populate('submittedBy', 'fullName department')
        .sort({ year: -1, createdAt: -1 })
        .lean();

    const papers = materials.filter((material) => EXAM_KINDS.includes(material.kind));
    const teaching = materials.filter((material) => !EXAM_KINDS.includes(material.kind));

    // --- exam grid --------------------------------------------------------
    // Rows for every year we hold a paper for, plus the last five, so a missing
    // recent paper shows as a gap instead of simply not existing.
    const thisYear = new Date().getFullYear();
    const recentYears = Array.from({ length: 5 }, (_, index) => thisYear - index);
    const paperYears = [...new Set([...papers.map((p) => p.year), ...recentYears])].sort(
        (a, b) => b - a
    );

    const openGaps = await MaterialRequest.find({
        course: course._id,
        fulfilledAt: null,
    }).lean();

    const paperRows = paperYears.map((year) => ({
        year,
        // What the course was called that year - the code on the paper's header
        codeAtTime: codeForYear(course, year),
        cells: Object.fromEntries(
            PAPER_EXAMS.map((exam) => {
                const found = papers
                    .filter((paper) => paper.year === year && paper.exam === exam)
                    .map((paper) => serialize(paper, viewerId));
                const gap = openGaps.find(
                    (request) =>
                        request.kind === 'past_paper' &&
                        request.year === year &&
                        request.exam === exam
                );
                // Several entries in one cell is normal and correct: separate
                // department cohorts sit separate papers for the same course.
                return [exam, { materials: found, requests: gap ? gap.count : 0 }];
            })
        ),
    }));

    // --- teaching groups --------------------------------------------------
    const groups = new Map();
    for (const material of teaching) {
        const key = groupKey(material);
        if (!groups.has(key)) {
            groups.set(key, {
                key,
                year: material.year,
                department: material.department,
                graduatingBatch: material.graduatingBatch,
                professors: material.professors || [],
                codeAtTime: codeForYear(course, material.year),
                materials: [],
            });
        }
        groups.get(key).materials.push(serialize(material, viewerId));
    }

    const teachingGroups = [...groups.values()].sort(
        (a, b) =>
            b.year - a.year ||
            a.department.localeCompare(b.department) ||
            (a.professors[0]?.name || '').localeCompare(b.professors[0]?.name || '')
    );

    // --- filter vocabulary ------------------------------------------------
    // Only values that actually occur, so no filter ever returns nothing
    const professorIndex = new Map();
    for (const material of materials) {
        for (const prof of material.professors || []) {
            if (!professorIndex.has(String(prof._id))) {
                professorIndex.set(String(prof._id), { ...prof, years: new Set() });
            }
            professorIndex.get(String(prof._id)).years.add(material.year);
        }
    }

    return {
        canonicalCode: course.codes.find((entry) => entry.current)?.code || course.codes[0]?.code,
        course: {
            _id: course._id,
            name: course.name,
            codes: course.codes,
            aliases: course.aliases,
            allDepartments: course.allDepartments,
            offeredTo: course.offeredTo,
            defaultSemester: course.defaultSemester,
            owningDepartment: course.owningDepartment,
            credits: course.credits,
            status: course.status,
        },
        papers: { exams: PAPER_EXAMS, rows: paperRows },
        teaching: teachingGroups,
        filters: {
            years: [...new Set(materials.map((m) => m.year))].sort((a, b) => b - a),
            departments: [...new Set(materials.map((m) => m.department))].sort(),
            batches: [...new Set(materials.map((m) => m.graduatingBatch))].sort((a, b) => b - a),
            professors: [...professorIndex.values()].map((prof) => ({
                _id: prof._id,
                name: prof.name,
                department: prof.department,
                years: [...prof.years].sort((a, b) => b - a),
            })),
        },
        counts: {
            total: materials.length,
            papers: papers.length,
            teaching: teaching.length,
        },
    };
};

module.exports = { buildCourseView, serialize, PAPER_EXAMS };
