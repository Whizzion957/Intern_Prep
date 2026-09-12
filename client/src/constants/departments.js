/**
 * IITR branches, keyed by the subdomain of the institute email
 * (name@cs.iitr.ac.in -> 'cs'). Mirrors DEPARTMENTS in
 * server/services/accessControl.js - keep the two in step.
 */

export const DEPARTMENTS = [
    { code: 'ar', name: 'Architecture and Planning' },
    { code: 'bt', name: 'Biosciences and Bioengineering' },
    { code: 'ce', name: 'Civil Engineering' },
    { code: 'ch', name: 'Chemical Engineering' },
    { code: 'cs', name: 'Computer Science and Engineering' },
    { code: 'cy', name: 'Chemistry' },
    { code: 'ec', name: 'Electronics and Communication Engineering' },
    { code: 'ece', name: 'Electronics and Communication Engineering' },
    { code: 'ee', name: 'Electrical Engineering' },
    { code: 'eq', name: 'Earthquake Engineering' },
    { code: 'es', name: 'Earth Sciences' },
    { code: 'hs', name: 'Humanities and Social Sciences' },
    { code: 'hy', name: 'Hydrology' },
    { code: 'ma', name: 'Mathematics' },
    { code: 'me', name: 'Mechanical and Industrial Engineering' },
    { code: 'mfs', name: 'Mehta Family School of Data Science and AI' },
    { code: 'ms', name: 'Management Studies' },
    { code: 'mt', name: 'Metallurgical and Materials Engineering' },
    { code: 'ph', name: 'Physics' },
    { code: 'wr', name: 'Water Resources Development and Management' },
];

export const DEFAULT_DEPARTMENT = 'cs';

export const departmentName = (code) =>
    DEPARTMENTS.find((d) => d.code === code)?.name || String(code || '').toUpperCase();

/**
 * A graduating batch has to be a real four-digit year. Anything outside this
 * window is a typo, not a batch.
 */
export const BATCH_MIN = 2000;
export const BATCH_MAX = new Date().getFullYear() + 8;

export const isValidBatch = (value) => {
    const year = Number(value);
    return /^\d{4}$/.test(String(value).trim()) && year >= BATCH_MIN && year <= BATCH_MAX;
};
