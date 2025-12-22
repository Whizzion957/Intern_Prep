const User = require('../models/User');
const Question = require('../models/Question');
const { Company } = require('../models/Company');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Superadmin only)
const getUsers = async (req, res) => {
    try {
        const { search, role, page = 1, limit = 20 } = req.query;

        let query = {};

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { enrollmentNumber: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { branch: { $regex: search, $options: 'i' } },
            ];
        }

        if (role) {
            query.role = role;
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-__v')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Superadmin only)
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be user or admin.' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Cannot change superadmin role
        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot change superadmin role' });
        }

        user.role = role;
        await user.save();

        res.json(user);
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add question for any user (superadmin only)
// @route   POST /api/admin/questions
// @access  Private (Superadmin only)
const addQuestionForUser = async (req, res) => {
    try {
        const { userId, company, type, otherType, month, year, result, question, suggestions } = req.body;

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Validate company exists
        const companyExists = await Company.findById(company);
        if (!companyExists) {
            return res.status(400).json({ message: 'Company not found' });
        }

        const newQuestion = await Question.create({
            submittedBy: userId,
            company,
            type,
            otherType: type === 'others' ? otherType : null,
            month,
            year,
            result,
            question,
            suggestions: suggestions || null,
        });

        const populatedQuestion = await Question.findById(newQuestion._id)
            .populate('submittedBy', 'fullName enrollmentNumber branch displayPicture')
            .populate('company', 'name logo');

        res.status(201).json(populatedQuestion);
    } catch (error) {
        console.error('Add question for user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin or Superadmin)
const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalQuestions = await Question.countDocuments();
        const totalCompanies = await Company.countDocuments();

        // Questions by type
        const questionsByType = await Question.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } },
        ]);

        // Questions by result
        const questionsByResult = await Question.aggregate([
            { $group: { _id: '$result', count: { $sum: 1 } } },
        ]);

        // Top companies by question count
        const topCompanies = await Question.aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'companies',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'company',
                },
            },
            { $unwind: '$company' },
            { $project: { name: '$company.name', logo: '$company.logo', count: 1 } },
        ]);

        res.json({
            totalUsers,
            totalQuestions,
            totalCompanies,
            questionsByType,
            questionsByResult,
            topCompanies,
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getUsers, updateUserRole, addQuestionForUser, getStats };
