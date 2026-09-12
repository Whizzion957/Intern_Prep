/**
 * Course code handling (Saviour)
 *
 * Codes are written inconsistently by everyone: "CSN-102", "csn102", "CSN 102".
 * Everything is matched on a normalized form, but the original spelling is kept
 * for display because that is what the exam paper header actually says.
 */

/** "csn-102" / "CSN 102" -> "CSN102" */
const normalizeCode = (code) =>
    String(code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

/**
 * The code a course went by in a given year.
 * Falls back to the current code when the year is unknown or uncovered.
 */
const codeForYear = (course, year) => {
    if (!course || !Array.isArray(course.codes) || course.codes.length === 0) return null;

    const current = course.codes.find((entry) => entry.current) || course.codes[0];
    if (!year) return current.code;

    const match = course.codes.find((entry) => {
        const from = entry.from ?? -Infinity;
        const until = entry.until ?? Infinity;
        return year >= from && year <= until;
    });

    return (match || current).code;
};

/** The code the course page is canonically addressed by. */
const currentCode = (course) => {
    if (!course || !Array.isArray(course.codes)) return null;
    const current = course.codes.find((entry) => entry.current) || course.codes[0];
    return current ? current.code : null;
};

/** True when `code` is a valid but no longer current name for this course. */
const isLegacyCode = (course, code) => {
    const normalized = normalizeCode(code);
    if (!normalized) return false;
    const entry = course.codes.find((c) => normalizeCode(c.code) === normalized);
    return Boolean(entry) && !entry.current;
};

module.exports = { normalizeCode, codeForYear, currentCode, isLegacyCode };
