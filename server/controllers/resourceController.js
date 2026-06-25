const Resource = require('../models/Resource');
const User = require('../models/User');
const { logResource } = require('../services/activityLogger');

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public
const getResources = async (req, res) => {
    try {
        const {
            search,
            category,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20,
        } = req.query;

        let query = {};

        // Filter by category
        if (category) {
            query.category = category;
        }

        // Build search query
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const total = await Resource.countDocuments(query);
        const resources = await Resource.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('submittedBy', 'fullName enrollmentNumber displayPicture');

        res.json({
            resources,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all distinct categories
// @route   GET /api/resources/categories
// @access  Public
const getCategories = async (req, res) => {
    try {
        const categories = await Resource.distinct('category');
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single resource
// @route   GET /api/resources/:id
// @access  Public
const getResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id)
            .populate('submittedBy', 'fullName enrollmentNumber branch displayPicture');

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        res.json(resource);
    } catch (error) {
        console.error('Get resource error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create resource
// @route   POST /api/resources
// @access  Private
const createResource = async (req, res) => {
    try {
        const { title, category, content } = req.body;

        if (!title || !category || !content) {
            return res.status(400).json({ message: 'Title, category, and content are required' });
        }

        const newResource = await Resource.create({
            title,
            category,
            content,
            submittedBy: req.user._id,
        });

        const populatedResource = await Resource.findById(newResource._id)
            .populate('submittedBy', 'fullName enrollmentNumber');

        // Log action
        await logResource(req.user, 'RESOURCE_CREATE', populatedResource, req);

        res.status(201).json(populatedResource);
    } catch (error) {
        console.error('Create resource error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private
const updateResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Check ownership
        const isOwner = resource.submittedBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to edit this resource' });
        }

        const { title, category, content } = req.body;

        if (title) resource.title = title;
        if (category) resource.category = category;
        if (content) resource.content = content;

        await resource.save();

        const updatedResource = await Resource.findById(resource._id)
            .populate('submittedBy', 'fullName enrollmentNumber');

        // Log action
        await logResource(req.user, 'RESOURCE_UPDATE', updatedResource, req);

        res.json(updatedResource);
    } catch (error) {
        console.error('Update resource error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private
const deleteResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Check ownership
        const isOwner = resource.submittedBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this resource' });
        }

        // Log before deleting
        await logResource(req.user, 'RESOURCE_DELETE', resource, req);

        await resource.deleteOne();

        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getResources,
    getCategories,
    getResource,
    createResource,
    updateResource,
    deleteResource,
};
