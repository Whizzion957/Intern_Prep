const Company = require('../models/Company');
const { cloudinary, uploadToCloudinary } = require('../config/cloudinary');

// @desc    Get all companies or search
// @route   GET /api/companies
// @access  Public
const getCompanies = async (req, res) => {
    try {
        const { search, limit = 50 } = req.query;

        let query = {};

        if (search) {
            query = { name: { $regex: search, $options: 'i' } };
        }

        const companies = await Company.find(query)
            .select('name logo')
            .sort({ name: 1 })
            .limit(parseInt(limit));

        res.json(companies);
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Public
const getCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id).populate('addedBy', 'fullName enrollmentNumber');

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.json(company);
    } catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create company
// @route   POST /api/companies
// @access  Private
const createCompany = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Company name is required' });
        }

        // Check if company already exists
        const existingCompany = await Company.findOne({
            name: { $regex: `^${name.trim()}$`, $options: 'i' }
        });

        if (existingCompany) {
            return res.status(400).json({ message: 'Company already exists', company: existingCompany });
        }

        let logoUrl = null;
        if (req.file) {
            try {
                console.log('Uploading logo to Cloudinary, size:', req.file.size, 'bytes');
                const result = await uploadToCloudinary(req.file.buffer);
                logoUrl = result.secure_url;
                console.log('Logo uploaded successfully:', logoUrl);
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                // Continue without logo if upload fails
                console.log('Continuing company creation without logo');
            }
        }

        const company = await Company.create({
            name: name.trim(),
            addedBy: req.user._id,
            logo: logoUrl,
        });

        res.status(201).json(company);
    } catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Update company logo
// @route   PUT /api/companies/:id/logo
// @access  Private
const updateCompanyLogo = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('Uploading logo to Cloudinary, size:', req.file.size, 'bytes');

        // Upload new logo (skip deleting old to avoid timeout issues)
        const result = await uploadToCloudinary(req.file.buffer);
        company.logo = result.secure_url;
        await company.save();

        console.log('Logo uploaded successfully:', result.secure_url);

        res.json(company);
    } catch (error) {
        console.error('Update company logo error:', error);
        res.status(500).json({ message: error.message || 'Failed to upload logo' });
    }
};

module.exports = { getCompanies, getCompany, createCompany, updateCompanyLogo };
