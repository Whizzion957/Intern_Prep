/**
 * Saviour routes
 *
 * Everything mounts under /api/saviour. Reuses the platform's auth middleware,
 * so access is the same IITR-only rule the rest of the app enforces
 * (server/middleware/auth.js -> services/accessControl.js).
 *
 * There is no upload endpoint anywhere in this module: materials are public
 * Google Drive links, and we store no bytes.
 */

const express = require('express');

const { protect, admin, superadmin } = require('../../middleware/auth');
const { createRateLimiter } = require('../../middleware/rateLimiter');

const {
    listCourses,
    getCourse,
    getCourseMaterials,
    createCourse,
    updateCourse,
    requestCourse,
    listCourseRequests,
    decideCourseRequest,
} = require('../controllers/courseController');

const {
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
} = require('../controllers/materialController');

const {
    listCustodians,
    myCustodianships,
    assignCustodian,
    removeCustodian,
} = require('../controllers/custodianController');

const {
    listProfessors,
    updateProfessor,
    mergeProfessor,
} = require('../controllers/professorController');

const router = express.Router();

// Everything below requires a signed-in, allowed IITR account
router.use(protect);

// --- Courses -------------------------------------------------------------
// Static segments before :identifier, or "requests" resolves as a course code
router.get('/courses/requests', admin, listCourseRequests);
router.post('/courses/requests', requestCourse);
// Accepting is what creates the catalog entry, so it is an admin action
router.patch('/courses/requests/:id', admin, decideCourseRequest);

router.get('/courses', listCourses);
router.post('/courses', admin, createCourse);
router.put('/courses/:id', admin, updateCourse);

router.get('/courses/:identifier', getCourse);
router.get('/courses/:identifier/materials', getCourseMaterials);

// --- Materials -----------------------------------------------------------
router.get('/materials/mine', myMaterials);
router.post('/materials', createRateLimiter('materials'), createMaterial);
router.post('/materials/request', requestMaterial);

router.get('/materials/:id', getMaterial);
router.patch('/materials/:id', updateMaterial);
router.delete('/materials/:id', withdrawMaterial);
router.post('/materials/:id/upvote', toggleUpvote);
router.post('/materials/:id/report', reportMaterial);

// --- Approval panel ------------------------------------------------------
// Scoping happens inside: superadmins see everything, a custodian sees only
// their own branch and batch, anyone else sees an empty queue.
router.get('/approvals', listApprovals);
router.patch('/materials/:id/decide', decideMaterial);
router.patch('/materials/:id/relink', relinkMaterial);

// --- Custodians ----------------------------------------------------------
router.get('/custodians/mine', myCustodianships);
router.get('/custodians', superadmin, listCustodians);
router.post('/custodians', superadmin, assignCustodian);
router.delete('/custodians/:id', superadmin, removeCustodian);

// --- Professors ----------------------------------------------------------
router.get('/professors', listProfessors);
router.patch('/professors/:id', admin, updateProfessor);
router.post('/professors/:id/merge', admin, mergeProfessor);

// --- Gap board -----------------------------------------------------------
router.get('/gaps', listGaps);

module.exports = router;
