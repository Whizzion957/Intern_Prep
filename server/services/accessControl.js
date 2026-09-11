/**
 * Access Control
 *
 * Decides who may use the platform based on their IITR email:
 * - Only verified @iitr.ac.in / @<dept>.iitr.ac.in accounts
 * - Optional department restriction (department = email subdomain)
 * - Optional batch restriction (joining year = first two digits of enrollment number)
 * - Per-email allow and block lists
 * Admins and superadmins are always allowed so nobody can lock themselves out.
 */

const AccessSettings = require('../models/AccessSettings');

// Department codes are the email subdomains (name@cs.iitr.ac.in -> 'cs').
// Codes not listed here still work; they're just shown as the raw code.
const DEPARTMENTS = {
    ar: 'Architecture and Planning',
    bt: 'Biosciences and Bioengineering',
    ce: 'Civil Engineering',
    ch: 'Chemical Engineering',
    cs: 'Computer Science and Engineering',
    cy: 'Chemistry',
    ec: 'Electronics and Communication Engineering',
    ece: 'Electronics and Communication Engineering',
    ee: 'Electrical Engineering',
    eq: 'Earthquake Engineering',
    es: 'Earth Sciences',
    hs: 'Humanities and Social Sciences',
    hy: 'Hydrology',
    ma: 'Mathematics',
    me: 'Mechanical and Industrial Engineering',
    mfs: 'Mehta Family School of Data Science and AI',
    ms: 'Management Studies',
    mt: 'Metallurgical and Materials Engineering',
    ph: 'Physics',
    wr: 'Water Resources Development and Management',
};

const IITR_EMAIL = /^[^@\s]+@(?:([a-z0-9-]+)\.)?iitr\.ac\.in$/;

/**
 * Parse an IITR email. Returns null for non-IITR emails, otherwise
 * { email, department } where department is the subdomain code (or null).
 */
const parseIitrEmail = (email) => {
    const normalized = String(email || '').trim().toLowerCase();
    const match = IITR_EMAIL.exec(normalized);
    if (!match) return null;
    return { email: normalized, department: match[1] || null };
};

const departmentName = (code) => DEPARTMENTS[code] || (code ? code.toUpperCase() : 'Unknown');

// Seeded users (utils/seedUsers.js) have made-up emails like 23114002@iitr.ac.in
const PLACEHOLDER_EMAIL = /^\d+@iitr\.ac\.in$/i;

// IITR Google display names end with the enrollment number, e.g. "AADIT KUMAR SAHOO 23114001"
const NAME_WITH_ENROLLMENT = /^(.*\S)\s+(\d{6,10})$/;

const parseGoogleName = (name) => {
    const trimmed = String(name || '').trim();
    const match = NAME_WITH_ENROLLMENT.exec(trimmed);
    return match
        ? { fullName: match[1], enrollmentNumber: match[2] }
        : { fullName: trimmed, enrollmentNumber: null };
};

// Joining year from the first two digits of the enrollment number (23114001 -> 2023)
const joiningYear = (enrollmentNumber) => {
    const match = /^(\d{2})\d{4,8}$/.exec(String(enrollmentNumber || ''));
    return match ? 2000 + parseInt(match[1]) : null;
};

// Settings are cached briefly so the per-request check in `protect` stays cheap
const CACHE_MS = 30 * 1000;
let cachedSettings = null;
let cachedAt = 0;

const getAccessSettings = async () => {
    if (cachedSettings && Date.now() - cachedAt < CACHE_MS) {
        return cachedSettings;
    }
    cachedSettings = await AccessSettings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global' } },
        { upsert: true, new: true }
    ).lean();
    cachedAt = Date.now();
    return cachedSettings;
};

const invalidateAccessSettings = () => {
    cachedSettings = null;
};

/**
 * Check whether a user ({ email, enrollmentNumber }) with a role may log in.
 * Returns { allowed: true } or { allowed: false, reason, department?, year? }.
 * reason: 'not_iitr' | 'blocked' | 'department' | 'year'
 */
const checkAccess = async ({ email, enrollmentNumber } = {}, role = 'user') => {
    const parsed = parseIitrEmail(email);
    if (!parsed) {
        return { allowed: false, reason: 'not_iitr' };
    }

    if (role === 'admin' || role === 'superadmin') {
        return { allowed: true };
    }

    const settings = await getAccessSettings();

    if (settings.blockedEmails?.includes(parsed.email)) {
        return { allowed: false, reason: 'blocked' };
    }

    if (settings.allowedEmails?.includes(parsed.email)) {
        return { allowed: true };
    }

    if (settings.restrictDepartments && !settings.allowedDepartments?.includes(parsed.department)) {
        return { allowed: false, reason: 'department', department: departmentName(parsed.department) };
    }

    if (settings.restrictYears) {
        // Unknown year (no enrollment number) is not allowed while this is on
        const year = joiningYear(enrollmentNumber);
        if (!settings.allowedYears?.includes(year)) {
            return { allowed: false, reason: 'year', year };
        }
    }

    return { allowed: true };
};

module.exports = {
    DEPARTMENTS,
    PLACEHOLDER_EMAIL,
    parseIitrEmail,
    parseGoogleName,
    joiningYear,
    departmentName,
    getAccessSettings,
    invalidateAccessSettings,
    checkAccess,
};
