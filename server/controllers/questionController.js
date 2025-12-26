const Question = require('../models/Question');
const { Company } = require('../models/Company');
const User = require('../models/User');
const mongoose = require('mongoose');
const { logQuestion, logAdmin } = require('../services/activityLogger');

// @desc    Get all questions with search, filter, and sort
// @route   GET /api/questions
// @access  Public
const getQuestions = async (req, res) => {
    try {
        const {
            search,
            company,
            type,
            year,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20,
        } = req.query;

        let query = {};

        // Filter by company ID
        if (company) {
            query.company = new mongoose.Types.ObjectId(company);
        }

        // Filter by type
        if (type) {
            query.type = type;
        }

        // Filter by year
        if (year) {
            query.year = parseInt(year);
        }

        // Build the aggregation pipeline
        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company',
                    foreignField: '_id',
                    as: 'company',
                },
            },
            { $unwind: '$company' },
            // Lookup current owner info
            {
                $lookup: {
                    from: 'users',
                    localField: 'submittedBy',
                    foreignField: '_id',
                    as: 'owner',
                },
            },
            {
                $addFields: {
                    owner: { $arrayElemAt: ['$owner', 0] }
                }
            },
        ];

        // Add search across joined fields if search term provided
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };

            pipeline.push({
                $match: {
                    $or: [
                        { 'company.name': searchRegex },
                        { 'owner.fullName': searchRegex },
                        { question: searchRegex },
                        { suggestions: searchRegex },
                        { 'owner.enrollmentNumber': searchRegex },
                    ],
                },
            });

            // Add priority score for sorting
            pipeline.push({
                $addFields: {
                    searchPriority: {
                        $switch: {
                            branches: [
                                {
                                    case: { $regexMatch: { input: '$company.name', regex: search, options: 'i' } },
                                    then: 1
                                },
                                {
                                    case: { $regexMatch: { input: { $ifNull: ['$owner.fullName', ''] }, regex: search, options: 'i' } },
                                    then: 2
                                },
                                {
                                    case: {
                                        $or: [
                                            { $regexMatch: { input: '$question', regex: search, options: 'i' } },
                                            { $regexMatch: { input: { $ifNull: ['$suggestions', ''] }, regex: search, options: 'i' } }
                                        ]
                                    },
                                    then: 3
                                },
                            ],
                            default: 5
                        }
                    }
                }
            });

            const sortField = sortBy === 'company' ? 'company.name' : sortBy;
            pipeline.push({
                $sort: {
                    searchPriority: 1,
                    [sortField]: sortOrder === 'asc' ? 1 : -1
                }
            });
        } else {
            const sortOptions = {};
            const sortField = sortBy === 'company' ? 'company.name' : sortBy;
            sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
            pipeline.push({ $sort: sortOptions });
        }

        // Count total documents
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await Question.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        // Project fields
        pipeline.push({
            $project: {
                _id: 1,
                type: 1,
                otherType: 1,
                month: 1,
                year: 1,
                question: 1,
                suggestions: 1,
                questionNumber: 1,
                submittedBy: 1,
                createdAt: 1,
                'company._id': 1,
                'company.name': 1,
                'company.logo': 1,
                'owner._id': 1,
                'owner.fullName': 1,
                'owner.enrollmentNumber': 1,
            },
        });

        const questions = await Question.aggregate(pipeline);

        res.json({
            questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Public
const getQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate('company', 'name logo')
            .populate('submittedBy', 'fullName enrollmentNumber branch displayPicture');

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        res.json(question);
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create question with auto-generated question number
// @route   POST /api/questions
// @access  Private
const createQuestion = async (req, res) => {
    try {
        const { company, type, otherType, month, year, question, suggestions } = req.body;

        // Validate company exists
        const companyExists = await Company.findById(company);
        if (!companyExists) {
            return res.status(400).json({ message: 'Company not found' });
        }

        // Auto-generate question number for this company
        const lastQuestion = await Question.findOne({ company })
            .sort({ questionNumber: -1 })
            .select('questionNumber');

        const questionNumber = (lastQuestion?.questionNumber || 0) + 1;

        const newQuestion = await Question.create({
            submittedBy: req.user?._id || null,
            company,
            questionNumber,
            type,
            otherType: type === 'others' ? otherType : null,
            month,
            year,
            question,
            suggestions: suggestions || null,
        });

        const populatedQuestion = await Question.findById(newQuestion._id)
            .populate('company', 'name logo');

        // Log the action
        await logQuestion(req.user, 'QUESTION_CREATE', populatedQuestion, req);

        res.status(201).json(populatedQuestion);
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update question (owner or admin only)
// @route   PUT /api/questions/:id
// @access  Private
const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Check ownership: only owner or admin can edit
        const isOwner = question.submittedBy && question.submittedBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to edit this question' });
        }

        const { company, type, otherType, month, year, question: questionText, suggestions } = req.body;

        // If company is being changed, validate it exists and update question number
        if (company && company !== question.company.toString()) {
            const companyExists = await Company.findById(company);
            if (!companyExists) {
                return res.status(400).json({ message: 'Company not found' });
            }
            question.company = company;

            // Reassign question number for new company
            const lastQuestion = await Question.findOne({ company, _id: { $ne: question._id } })
                .sort({ questionNumber: -1 })
                .select('questionNumber');
            question.questionNumber = (lastQuestion?.questionNumber || 0) + 1;
        }

        if (type) question.type = type;
        if (type === 'others' && otherType) question.otherType = otherType;
        if (type && type !== 'others') question.otherType = null;
        if (month) question.month = month;
        if (year) question.year = year;
        if (questionText) question.question = questionText;
        if (suggestions !== undefined) question.suggestions = suggestions || null;

        await question.save();

        const updatedQuestion = await Question.findById(question._id)
            .populate('company', 'name logo');

        // Log the action
        await logQuestion(req.user, 'QUESTION_UPDATE', updatedQuestion, req);

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete question (owner or admin only)
// @route   DELETE /api/questions/:id
// @access  Private
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Check ownership: only owner or admin can delete
        const isOwner = question.submittedBy && question.submittedBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this question' });
        }

        // Log before deleting
        await logQuestion(req.user, 'QUESTION_DELETE', question, req);

        await question.deleteOne();

        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark question as visited
// @route   POST /api/questions/:id/visit
// @access  Private
const markVisited = async (req, res) => {
    try {
        const questionId = req.params.id;
        const userId = req.user._id;

        // Check question exists
        const questionExists = await Question.exists({ _id: questionId });
        if (!questionExists) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Add to visited list if not already there (using $addToSet for efficiency)
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { visitedQuestions: questionId } },
            { new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark visited error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user's visited question IDs
// @route   GET /api/questions/visited
// @access  Private
const getVisitedQuestions = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('visitedQuestions');
        res.json(user?.visitedQuestions || []);
    } catch (error) {
        console.error('Get visited questions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user's own submissions (questions they own)
// @route   GET /api/questions/my-submissions
// @access  Private
const getMySubmissions = async (req, res) => {
    try {
        const questions = await Question.find({ submittedBy: req.user._id })
            .populate('submittedBy', 'fullName enrollmentNumber branch displayPicture')
            .populate('company', 'name logo')
            .sort({ createdAt: -1 });

        res.json(questions);
    } catch (error) {
        console.error('Get my submissions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get count of questions owned by current user
// @route   GET /api/questions/my-submissions-count
// @access  Private
const getMySubmissionsCount = async (req, res) => {
    try {
        const count = await Question.countDocuments({
            submittedBy: req.user._id
        });
        res.json({ count });
    } catch (error) {
        console.error('Get my submissions count error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin: Transfer question ownership
// @route   PUT /api/questions/:id/transfer
// @access  Private (Admin only)
const transferOwnership = async (req, res) => {
    try {
        const { newOwnerEnrollment } = req.body;

        if (!newOwnerEnrollment) {
            return res.status(400).json({ message: 'New owner enrollment number is required' });
        }

        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Find new owner by enrollment number
        const newOwner = await User.findOne({ enrollmentNumber: newOwnerEnrollment });
        if (!newOwner) {
            return res.status(404).json({ message: 'User with this enrollment number not found' });
        }

        // Don't transfer if already owned by this user
        if (question.submittedBy && question.submittedBy.toString() === newOwner._id.toString()) {
            return res.status(400).json({ message: 'User already owns this question' });
        }

        // Add to ownership history
        question.ownershipHistory.push({
            previousOwner: question.submittedBy,
            transferredTo: newOwner._id,
            transferredBy: req.user._id,
            date: new Date(),
        });

        // Transfer ownership
        question.submittedBy = newOwner._id;
        await question.save();

        const updatedQuestion = await Question.findById(question._id)
            .populate('company', 'name logo')
            .populate('submittedBy', 'fullName enrollmentNumber branch displayPicture');

        // Log the transfer
        await logQuestion(req.user, 'QUESTION_TRANSFER', updatedQuestion, req, {
            previousOwner: question.ownershipHistory[question.ownershipHistory.length - 1]?.previousOwner,
            newOwner: newOwner._id,
            newOwnerEnrollment: newOwner.enrollmentNumber,
        });

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Transfer ownership error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get rate limit status for current user
// @route   GET /api/questions/rate-limits
// @access  Private
const getRateLimitInfo = async (req, res) => {
    try {
        const { getRateLimitStatus, RATE_LIMITS } = require('../middleware/rateLimiter');
        const { isRedisConnected } = require('../config/redis');

        // If Redis is not connected, return null status
        if (!isRedisConnected()) {
            return res.json({
                enabled: false,
                message: 'Rate limiting is not active',
            });
        }

        const userId = req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        // Get status for all actions
        const statuses = {};
        for (const action of Object.keys(RATE_LIMITS)) {
            const status = await getRateLimitStatus(userId, action);
            if (status) {
                // Override limit if admin
                status.limit = isAdmin ? RATE_LIMITS[action].admin : RATE_LIMITS[action].user;
                status.remaining = Math.max(0, status.limit - status.used);
                statuses[action] = status;
            }
        }

        res.json({
            enabled: true,
            isAdmin,
            limits: statuses,
        });
    } catch (error) {
        console.error('Get rate limit info error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    markVisited,
    getVisitedQuestions,
    getMySubmissions,
    getMySubmissionsCount,
    transferOwnership,
    getRateLimitInfo,
};

