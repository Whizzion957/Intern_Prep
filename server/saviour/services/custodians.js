/**
 * Custodian routing (Saviour)
 *
 * A submission is approved by the student responsible for that branch and that
 * graduating batch, or by a superadmin. This module answers the two questions
 * everything else asks: "who approves this?" and "what may this person see in
 * the approval panel?".
 */

const Custodian = require('../models/Custodian');
const { joiningYear } = require('../../services/accessControl');

// B.Tech is four years. Integrated and dual degrees are not, and the enrollment
// number doesn't reliably say which - so this is only ever a default for the
// submission form, never an authority. The student picks the real batch.
const DEFAULT_COURSE_LENGTH = 4;

/** Best guess at a user's graduating batch, for prefilling a form. */
const guessGraduatingBatch = (user) => {
    const joined = joiningYear(user?.enrollmentNumber);
    return joined ? joined + DEFAULT_COURSE_LENGTH : null;
};

const isSuperadmin = (user) => user?.role === 'superadmin';

/** The custodian for a branch and batch, or null if nobody is appointed yet. */
const custodianFor = async (department, graduatingBatch) => {
    if (!department || !graduatingBatch) return null;
    return Custodian.findOne({
        department: String(department).toLowerCase(),
        graduatingBatch: Number(graduatingBatch),
        active: true,
    }).lean();
};

/** Every (department, batch) pair this user is responsible for. */
const custodianships = async (user) => {
    if (!user?.email) return [];
    return Custodian.find({ email: user.email.toLowerCase(), active: true }).lean();
};

/**
 * Can this user decide on this material?
 * Superadmins can decide anything; a custodian only within their own scope.
 */
const canDecide = async (user, material) => {
    if (isSuperadmin(user)) return true;

    const mine = await custodianships(user);
    return mine.some(
        (entry) =>
            entry.department === material.department &&
            entry.graduatingBatch === material.graduatingBatch
    );
};

/**
 * Mongo filter for the approval queue this user should see.
 * Returns null when they are responsible for nothing - the caller shows an
 * empty panel rather than leaking the whole queue.
 */
const queueScope = async (user) => {
    if (isSuperadmin(user)) return {};

    const mine = await custodianships(user);
    if (mine.length === 0) return null;

    return {
        $or: mine.map((entry) => ({
            department: entry.department,
            graduatingBatch: entry.graduatingBatch,
        })),
    };
};

module.exports = {
    DEFAULT_COURSE_LENGTH,
    guessGraduatingBatch,
    isSuperadmin,
    custodianFor,
    custodianships,
    canDecide,
    queueScope,
};
