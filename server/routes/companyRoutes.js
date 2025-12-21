const express = require('express');
const router = express.Router();
const {
    getCompanies,
    getCompany,
    createCompany,
    updateCompanyLogo,
} = require('../controllers/companyController');
const { protect } = require('../middleware/auth');
const { uploadLogo } = require('../config/cloudinary');

router.get('/', getCompanies);
router.get('/:id', getCompany);
router.post('/', protect, uploadLogo.single('logo'), createCompany);
router.put('/:id/logo', protect, uploadLogo.single('logo'), updateCompanyLogo);

module.exports = router;
