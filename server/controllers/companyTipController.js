const CompanyTip = require('../models/CompanyTip');

// @desc    Get tips for a company (with nested structure)
// @route   GET /api/companies/:companyId/tips
// @access  Public
const getTips = async (req, res) => {
    try {
        const { companyId } = req.params;

        // Get all tips for this company
        const tips = await CompanyTip.find({ company: companyId })
            .populate('author', 'fullName enrollmentNumber branch displayPicture')
            .sort({ createdAt: -1 });

        // Build nested structure
        const tipMap = {};
        const rootTips = [];

        // First pass: create map of all tips
        tips.forEach(tip => {
            tipMap[tip._id.toString()] = { ...tip.toObject(), replies: [] };
        });

        // Second pass: build tree structure
        tips.forEach(tip => {
            const tipObj = tipMap[tip._id.toString()];
            if (tip.parentTip) {
                const parentTip = tipMap[tip.parentTip.toString()];
                if (parentTip) {
                    parentTip.replies.push(tipObj);
                }
            } else {
                rootTips.push(tipObj);
            }
        });

        // Sort replies within each tip by createdAt (recent first)
        const sortReplies = (tip) => {
            tip.replies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            tip.replies.forEach(sortReplies);
        };
        rootTips.forEach(sortReplies);

        res.json(rootTips);
    } catch (error) {
        console.error('Get tips error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a tip (root or reply)
// @route   POST /api/companies/:companyId/tips
// @access  Private
const createTip = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { content, parentTip } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const tip = await CompanyTip.create({
            company: companyId,
            author: req.user._id,
            content: content.trim(),
            parentTip: parentTip || null,
        });

        const populatedTip = await CompanyTip.findById(tip._id)
            .populate('author', 'fullName enrollmentNumber branch displayPicture');

        res.status(201).json({ ...populatedTip.toObject(), replies: [] });
    } catch (error) {
        console.error('Create tip error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a tip
// @route   PUT /api/tips/:id
// @access  Private (Author or Admin)
const updateTip = async (req, res) => {
    try {
        const tip = await CompanyTip.findById(req.params.id);

        if (!tip) {
            return res.status(404).json({ message: 'Tip not found' });
        }

        // Check permission: author or admin
        const isAuthor = tip.author.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this tip' });
        }

        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Content is required' });
        }

        tip.content = content.trim();
        await tip.save();

        const populatedTip = await CompanyTip.findById(tip._id)
            .populate('author', 'fullName enrollmentNumber branch displayPicture');

        res.json(populatedTip);
    } catch (error) {
        console.error('Update tip error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a tip (and all replies)
// @route   DELETE /api/tips/:id
// @access  Private (Author or Admin)
const deleteTip = async (req, res) => {
    try {
        const tip = await CompanyTip.findById(req.params.id);

        if (!tip) {
            return res.status(404).json({ message: 'Tip not found' });
        }

        // Check permission: author or admin
        const isAuthor = tip.author.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this tip' });
        }

        // Delete all replies recursively
        const deleteReplies = async (tipId) => {
            const replies = await CompanyTip.find({ parentTip: tipId });
            for (const reply of replies) {
                await deleteReplies(reply._id);
                await CompanyTip.deleteOne({ _id: reply._id });
            }
        };

        await deleteReplies(tip._id);
        await CompanyTip.deleteOne({ _id: tip._id });

        res.json({ message: 'Tip deleted' });
    } catch (error) {
        console.error('Delete tip error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getTips, createTip, updateTip, deleteTip };
