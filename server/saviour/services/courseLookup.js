/**
 * Course resolution (Saviour)
 *
 * One place that answers "what course does this string mean?", used by the
 * course page, the typeahead and the material submission form so they can
 * never disagree. Resolution order: exact code (any era) -> alias -> name.
 */

const Course = require('../models/Course');
const { normalizeCode } = require('./courseCodes');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Resolve an identifier to a single course. Accepts a Mongo _id, any code the
 * course has ever used, or an exact alias. Returns null when nothing matches.
 *
 * Follows `mergedInto` so retired courses land on their successor. The returned
 * object carries `_resolvedFrom` when a redirect happened, so the route can 301.
 */
const resolveCourse = async (identifier) => {
    const raw = String(identifier || '').trim();
    if (!raw) return null;

    let course = null;

    if (/^[a-f0-9]{24}$/i.test(raw)) {
        course = await Course.findById(raw);
    }

    if (!course) {
        const normalized = normalizeCode(raw);
        if (normalized) {
            course = await Course.findOne({ normalizedCodes: normalized });
        }
    }

    if (!course) {
        course = await Course.findOne({
            aliases: new RegExp(`^${escapeRegex(raw)}$`, 'i'),
        });
    }

    if (!course) return null;

    // Follow at most one merge hop; a chain means the catalog is misconfigured.
    if (course.status === 'merged' && course.mergedInto) {
        const successor = await Course.findById(course.mergedInto);
        if (successor) {
            successor._resolvedFrom = course;
            return successor;
        }
    }

    return course;
};

/**
 * Typeahead search. Matches codes by prefix, aliases and name by substring.
 * Ranked: code match first, then alias, then name.
 */
const searchCourses = async ({ query, department, semester, limit = 20 }) => {
    const filters = { status: { $ne: 'retired' } };

    // A course is taken by one branch, several, or all of them - so filtering
    // by branch has to keep the institute-wide courses too.
    if (department) {
        filters.$and = [
            {
                $or: [
                    { allDepartments: true },
                    { 'offeredTo.department': String(department).toLowerCase() },
                ],
            },
        ];
    }
    if (semester) {
        const bySemester = {
            $or: [
                { 'offeredTo.semester': Number(semester) },
                { allDepartments: true, defaultSemester: Number(semester) },
            ],
        };
        filters.$and = [...(filters.$and || []), bySemester];
    }

    const raw = String(query || '').trim();
    if (!raw) {
        return Course.find(filters).sort({ name: 1 }).limit(limit).lean();
    }

    const normalized = normalizeCode(raw);
    const nameRegex = new RegExp(escapeRegex(raw), 'i');

    const or = [{ aliases: nameRegex }, { name: nameRegex }];
    if (normalized) or.push({ normalizedCodes: new RegExp(`^${normalized}`) });

    const results = await Course.find({ ...filters, $or: or }).limit(limit * 2).lean();

    const rank = (course) => {
        if (normalized && course.normalizedCodes.some((c) => c.startsWith(normalized))) return 0;
        if (course.aliases.some((a) => nameRegex.test(a))) return 1;
        return 2;
    };

    return results
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
        .slice(0, limit);
};

module.exports = { resolveCourse, searchCourses };
