const User = require('../models/User');
const Question = require('../models/Question');
const { Company } = require('../models/Company');
const AccessSettings = require('../models/AccessSettings');
const { logAdmin, logQuestion } = require('../services/activityLogger');
const {
    DEPARTMENTS,
    departmentName,
    joiningYear,
    parseGoogleName,
    getAccessSettings,
    invalidateAccessSettings,
} = require('../services/accessControl');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Superadmin only)
// Users an admin should check: no enrollment number, or a Google display name whose
// trailing number disagrees with it (the user may have edited their Google name).
const findUsersNeedingReview = async () => {
    const users = await User.find({}, { enrollmentNumber: 1, googleName: 1 }).lean();
    return users
        .filter((user) => {
            const fromName = parseGoogleName(user.googleName).enrollmentNumber;
            if (!user.enrollmentNumber) return true;
            return Boolean(fromName) && fromName !== user.enrollmentNumber;
        })
        .map((user) => user._id);
};

const getUsers = async (req, res) => {
    try {
        const { search, role, page = 1, limit = 20, needsReview } = req.query;

        let query = {};

        const reviewIds = await findUsersNeedingReview();
        if (needsReview === 'true') {
            query._id = { $in: reviewIds };
        }

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
            reviewCount: reviewIds.length,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
                hasMore: parseInt(page) * parseInt(limit) < total,
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

        const previousRole = user.role;
        user.role = role;
        await user.save();

        // Log the role change
        await logAdmin(req.user, 'USER_ROLE_CHANGE', user, 'user', req, {
            previousRole,
            newRole: role,
        });

        res.json(user);
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Set or clear a user's enrollment number
// @route   PUT /api/admin/users/:id/enrollment
// @access  Private (Superadmin only)
const updateUserEnrollment = async (req, res) => {
    try {
        const enrollmentNumber = String(req.body.enrollmentNumber ?? '').trim();

        if (enrollmentNumber && !/^\d{6,10}$/.test(enrollmentNumber)) {
            return res.status(400).json({ message: 'Enrollment number must be 6-10 digits, or empty to clear it.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (enrollmentNumber) {
            const owner = await User.findOne({ enrollmentNumber, _id: { $ne: user._id } });
            if (owner) {
                return res.status(409).json({
                    message: `${enrollmentNumber} already belongs to ${owner.fullName} (${owner.email}).`,
                });
            }
        }

        const previous = user.enrollmentNumber || null;
        if (enrollmentNumber) {
            user.enrollmentNumber = enrollmentNumber;
        } else {
            user.set('enrollmentNumber', undefined);
        }
        await user.save();

        await logAdmin(req.user, 'USER_ENROLLMENT_CHANGE', user, 'user', req, {
            previousEnrollment: previous,
            newEnrollment: enrollmentNumber || null,
            googleName: user.googleName,
        });

        res.json(user);
    } catch (error) {
        console.error('Update user enrollment error:', error);
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

        // Log the action
        await logQuestion(req.user, 'ADMIN_ADD_QUESTION', populatedQuestion, req, {
            createdFor: user.fullName,
            createdForId: user._id,
        });

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

// @desc    Get login access rules
// @route   GET /api/admin/access
// @access  Private (Superadmin only)
const getAccessRules = async (req, res) => {
    try {
        const settings = await getAccessSettings();

        // Departments seen among existing users, so unlisted codes show up too
        const userCounts = await User.aggregate([
            { $match: { department: { $type: 'string' } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
        ]);
        const counts = Object.fromEntries(userCounts.map((d) => [d._id, d.count]));

        const codes = new Set([
            ...Object.keys(DEPARTMENTS),
            ...Object.keys(counts),
            ...(settings.allowedDepartments || []),
        ]);
        const departments = [...codes]
            .map((code) => ({ code, name: departmentName(code), users: counts[code] || 0 }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Batches (joining years) among users, plus the last few years
        const yearCounts = {};
        const enrollments = await User.find(
            { enrollmentNumber: { $type: 'string' } },
            { enrollmentNumber: 1, _id: 0 }
        ).lean();
        for (const { enrollmentNumber } of enrollments) {
            const year = joiningYear(enrollmentNumber);
            if (year) yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
        const currentYear = new Date().getFullYear();
        const yearSet = new Set([
            ...Object.keys(yearCounts).map(Number),
            ...Array.from({ length: 6 }, (_, i) => currentYear - i),
            ...(settings.allowedYears || []),
        ]);
        const years = [...yearSet]
            .sort((a, b) => b - a)
            .map((year) => ({ year, users: yearCounts[year] || 0 }));

        res.json({
            restrictDepartments: settings.restrictDepartments,
            allowedDepartments: settings.allowedDepartments || [],
            restrictYears: settings.restrictYears || false,
            allowedYears: settings.allowedYears || [],
            years,
            allowedEmails: settings.allowedEmails || [],
            blockedEmails: settings.blockedEmails || [],
            updatedAt: settings.updatedAt,
            departments,
        });
    } catch (error) {
        console.error('Get access rules error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update login access rules
// @route   PUT /api/admin/access
// @access  Private (Superadmin only)
const updateAccessRules = async (req, res) => {
    try {
        const {
            restrictDepartments,
            allowedDepartments,
            restrictYears,
            allowedYears,
            allowedEmails,
            blockedEmails,
        } = req.body;

        const cleanList = (list, pattern) =>
            [...new Set((Array.isArray(list) ? list : [])
                .map((item) => String(item).trim().toLowerCase())
                .filter((item) => pattern.test(item)))];

        const departmentCodes = cleanList(allowedDepartments, /^[a-z0-9-]{1,20}$/);
        const allowEmails = cleanList(allowedEmails, /^[^@\s]+@[^@\s]+$/);
        const blockEmails = cleanList(blockedEmails, /^[^@\s]+@[^@\s]+$/);

        const years = [...new Set((Array.isArray(allowedYears) ? allowedYears : [])
            .map((year) => parseInt(year))
            .filter((year) => year >= 2000 && year <= 2099))];

        if (restrictDepartments && departmentCodes.length === 0) {
            return res.status(400).json({ message: 'Select at least one department, or turn off the restriction.' });
        }
        if (restrictYears && years.length === 0) {
            return res.status(400).json({ message: 'Select at least one batch, or turn off the restriction.' });
        }

        const settings = await AccessSettings.findOneAndUpdate(
            { key: 'global' },
            {
                restrictDepartments: Boolean(restrictDepartments),
                allowedDepartments: departmentCodes,
                restrictYears: Boolean(restrictYears),
                allowedYears: years,
                allowedEmails: allowEmails,
                blockedEmails: blockEmails,
                updatedBy: req.user._id,
            },
            { upsert: true, new: true }
        );
        invalidateAccessSettings();

        await logAdmin(req.user, 'ACCESS_RULES_UPDATE', null, 'system', req, {
            restrictDepartments: settings.restrictDepartments,
            allowedDepartments: settings.allowedDepartments,
            restrictYears: settings.restrictYears,
            allowedYears: settings.allowedYears,
            allowedEmails: settings.allowedEmails.length,
            blockedEmails: settings.blockedEmails.length,
        });

        res.json({ message: 'Access rules updated' });
    } catch (error) {
        console.error('Update access rules error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUsers,
    updateUserRole,
    updateUserEnrollment,
    addQuestionForUser,
    getStats,
    getAccessRules,
    updateAccessRules,
};
