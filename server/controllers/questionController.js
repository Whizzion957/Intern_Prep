const Question = require('../models/Question');
const Company = require('../models/Company');
const User = require('../models/User');

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

        // NOTE: Search is applied AFTER company join so we can search company names
        // See the $match after $lookup below

        // Filter by company ID (not search)
        if (company) {
            query.company = company;
        }

        // Filter by type
        if (type) {
            query.type = type;
        }

        // result field removed - no longer filtering by result

        // Filter by year
        if (year) {
            query.year = parseInt(year);
        }

        // Build the aggregation pipeline - questions are anonymous, no user join needed
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
        ];

        // Add search across joined fields if search term provided
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { question: { $regex: search, $options: 'i' } },
                        { suggestions: { $regex: search, $options: 'i' } },
                        { 'company.name': { $regex: search, $options: 'i' } },
                    ],
                },
            });
        }

        // Sorting
        const sortOptions = {};
        const sortField = sortBy === 'company' ? 'company.name' : sortBy;
        sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
        pipeline.push({ $sort: sortOptions });

        // Count total documents
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await Question.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        // Project fields - anonymized, no user info
        pipeline.push({
            $project: {
                _id: 1,
                type: 1,
                otherType: 1,
                month: 1,
                year: 1,
                question: 1,
                suggestions: 1,
                claimedBy: 1,
                createdAt: 1,
                'company._id': 1,
                'company.name': 1,
                'company.logo': 1,
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
            .populate('claimedBy.user', 'fullName enrollmentNumber branch displayPicture');

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        res.json(question);
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create question
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

        const newQuestion = await Question.create({
            // submittedBy is optional - can be null for anonymous
            submittedBy: req.user?._id || null,
            company,
            type,
            otherType: type === 'others' ? otherType : null,
            month,
            year,
            question,
            suggestions: suggestions || null,
        });

        const populatedQuestion = await Question.findById(newQuestion._id)
            .populate('company', 'name logo');

        res.status(201).json(populatedQuestion);
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Any authenticated user)
const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // No ownership check - any authenticated user can edit
        const { company, type, otherType, month, year, question: questionText, suggestions } = req.body;

        // If company is being changed, validate it exists
        if (company && company !== question.company.toString()) {
            const companyExists = await Company.findById(company);
            if (!companyExists) {
                return res.status(400).json({ message: 'Company not found' });
            }
            question.company = company;
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

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Any authenticated user)
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // No ownership check - any authenticated user can delete
        await question.deleteOne();

        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Claim a question (user associates themselves with it)
// @route   POST /api/questions/:id/claim
// @access  Private
const claimQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Check if user already claimed this question
        const alreadyClaimed = question.claimedBy.some(
            claim => claim.user.toString() === req.user._id.toString()
        );

        if (alreadyClaimed) {
            return res.status(400).json({ message: 'You have already claimed this question' });
        }

        // Add user to claimedBy array
        question.claimedBy.push({
            user: req.user._id,
            claimedAt: new Date(),
        });

        await question.save();

        // Return updated question with populated claims
        const updatedQuestion = await Question.findById(question._id)
            .populate('company', 'name logo')
            .populate('claimedBy.user', 'fullName enrollmentNumber branch displayPicture');

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Claim question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Unclaim a question (user removes their association)
// @route   DELETE /api/questions/:id/claim
// @access  Private
const unclaimQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Find and remove user's claim
        const claimIndex = question.claimedBy.findIndex(
            claim => claim.user.toString() === req.user._id.toString()
        );

        if (claimIndex === -1) {
            return res.status(400).json({ message: 'You have not claimed this question' });
        }

        question.claimedBy.splice(claimIndex, 1);
        await question.save();

        // Return updated question with populated claims
        const updatedQuestion = await Question.findById(question._id)
            .populate('company', 'name logo')
            .populate('claimedBy.user', 'fullName enrollmentNumber branch displayPicture');

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Unclaim question error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user's own questions
// @route   GET /api/questions/my
// @access  Private
const getMyQuestions = async (req, res) => {
    try {
        // Find questions where submittedBy user has matching enrollment number
        const User = require('../models/User');
        const usersWithSameEnrollment = await User.find({ enrollmentNumber: req.user.enrollmentNumber }).select('_id');
        const userIds = usersWithSameEnrollment.map(u => u._id);

        const questions = await Question.find({ submittedBy: { $in: userIds } })
            .populate('submittedBy', 'fullName enrollmentNumber branch displayPicture')
            .populate('company', 'name logo')
            .sort({ createdAt: -1 });

        res.json(questions);
    } catch (error) {
        console.error('Get my questions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin: Add a claim for any user
// @route   POST /api/questions/:id/claim/:userId
// @access  Private (Admin only)
const adminAddClaim = async (req, res) => {
    try {
        const { id, userId } = req.params;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user already claimed
        const alreadyClaimed = question.claimedBy.some(
            claim => claim.user.toString() === userId
        );

        if (alreadyClaimed) {
            return res.status(400).json({ message: 'User has already claimed this question' });
        }

        question.claimedBy.push({
            user: userId,
            claimedAt: new Date(),
        });

        await question.save();

        const updatedQuestion = await Question.findById(question._id)
            .populate('company', 'name logo')
            .populate('claimedBy.user', 'fullName enrollmentNumber branch displayPicture');

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Admin add claim error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin: Remove a claim for any user
// @route   DELETE /api/questions/:id/claim/:userId
// @access  Private (Admin only)
const adminRemoveClaim = async (req, res) => {
    try {
        const { id, userId } = req.params;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const claimIndex = question.claimedBy.findIndex(
            claim => claim.user.toString() === userId
        );

        if (claimIndex === -1) {
            return res.status(400).json({ message: 'User has not claimed this question' });
        }

        question.claimedBy.splice(claimIndex, 1);
        await question.save();

        const updatedQuestion = await Question.findById(question._id)
            .populate('company', 'name logo')
            .populate('claimedBy.user', 'fullName enrollmentNumber branch displayPicture');

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Admin remove claim error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get count of questions claimed by current user
// @route   GET /api/questions/my-claims-count
// @access  Private
const getMyClaimsCount = async (req, res) => {
    try {
        const count = await Question.countDocuments({
            'claimedBy.user': req.user._id
        });
        res.json({ count });
    } catch (error) {
        console.error('Get my claims count error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    claimQuestion,
    unclaimQuestion,
    getMyQuestions,
    getMyClaimsCount,
    adminAddClaim,
    adminRemoveClaim,
};


