const express = require('express');
const router = express.Router();
const {
    getCompanies,
    getCompany,
    createCompany,
    updateCompanyLogo,
    updateCompanyDetails,
    getBranchLists,
} = require('../controllers/companyController');
const {
    getTips,
    createTip,
    updateTip,
    deleteTip,
} = require('../controllers/companyTipController');
const { protect, admin } = require('../middleware/auth');
const { uploadLogo } = require('../config/cloudinary');

// Company routes
router.get('/branches', getBranchLists);
router.get('/', getCompanies);
router.get('/:id', getCompany);
router.post('/', protect, uploadLogo.single('logo'), createCompany);
router.put('/:id/logo', protect, uploadLogo.single('logo'), updateCompanyLogo);
router.put('/:id/details', protect, admin, updateCompanyDetails);

// Tips routes (nested under companies)
router.get('/:companyId/tips', getTips);
router.post('/:companyId/tips', protect, createTip);

// Standalone tip routes
router.put('/tips/:id', protect, updateTip);
router.delete('/tips/:id', protect, deleteTip);

module.exports = router;
