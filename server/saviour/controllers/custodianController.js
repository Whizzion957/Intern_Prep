/**
 * Custodian endpoints (Saviour) - superadmin only, except `mine`.
 *
 * One student per branch per graduating batch. In practice this is the person
 * who already owns that batch's saviour Drive folder; appointing them here is
 * what routes approvals to them.
 */

const Custodian = require('../models/Custodian');
const User = require('../../models/User');
const { parseIitrEmail, departmentName } = require('../../services/accessControl');
const { custodianships } = require('../services/custodians');

/** GET /api/saviour/custodians */
const listCustodians = async (req, res) => {
    try {
        const custodians = await Custodian.find(
            req.query.includeInactive === 'true' ? {} : { active: true }
        )
            .populate('user', 'fullName email')
            .sort({ graduatingBatch: -1, department: 1 })
            .lean();

        res.json({
            custodians: custodians.map((custodian) => ({
                ...custodian,
                departmentLabel: departmentName(custodian.department),
            })),
        });
    } catch (error) {
        console.error('[saviour] listCustodians:', error);
        res.status(500).json({ message: 'Could not load custodians' });
    }
};

/** GET /api/saviour/custodians/mine - what the signed-in user is responsible for */
const myCustodianships = async (req, res) => {
    try {
        const mine = await custodianships(req.user);
        res.json({
            custodianships: mine.map((entry) => ({
                ...entry,
                departmentLabel: departmentName(entry.department),
            })),
            isSuperadmin: req.user.role === 'superadmin',
            // The catalog is admin-owned, so admins see course requests even
            // when they are custodian for nothing.
            isAdmin: req.user.role === 'admin' || req.user.role === 'superadmin',
        });
    } catch (error) {
        console.error('[saviour] myCustodianships:', error);
        res.status(500).json({ message: 'Could not load your custodianships' });
    }
};

/**
 * POST /api/saviour/custodians
 * Body: { email, department, graduatingBatch, driveFolderUrl, note }
 *
 * Appointing by email means a custodian can be set up before they have ever
 * signed in; `user` is attached as soon as an account with that email exists.
 */
const assignCustodian = async (req, res) => {
    try {
        const { email, department, graduatingBatch, driveFolderUrl, note } = req.body;

        const parsed = parseIitrEmail(email);
        if (!parsed) {
            return res.status(400).json({ message: 'Needs an IITR email address' });
        }
        if (!department || !graduatingBatch) {
            return res.status(400).json({ message: 'department and graduatingBatch are required' });
        }

        // The email's own subdomain is a hint, not a rule: a CSE student can be
        // asked to look after another branch's folder if that is who volunteered.
        const user = await User.findOne({ email: parsed.email }).select('_id');

        const custodian = await Custodian.findOneAndUpdate(
            {
                department: String(department).toLowerCase(),
                graduatingBatch: Number(graduatingBatch),
            },
            {
                email: parsed.email,
                user: user?._id || null,
                driveFolderUrl: driveFolderUrl || null,
                note: note || null,
                active: true,
                assignedBy: req.user._id,
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({
            custodian,
            warning:
                parsed.department && parsed.department !== String(department).toLowerCase()
                    ? `Note: ${parsed.email} is a ${parsed.department.toUpperCase()} address but has been `
                      + `made custodian for ${String(department).toUpperCase()}.`
                    : null,
        });
    } catch (error) {
        console.error('[saviour] assignCustodian:', error);
        res.status(500).json({ message: 'Could not assign custodian' });
    }
};

/** DELETE /api/saviour/custodians/:id - stand someone down */
const removeCustodian = async (req, res) => {
    try {
        const custodian = await Custodian.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );
        if (!custodian) return res.status(404).json({ message: 'No such custodian' });

        // Pending materials keep their routedTo snapshot; they fall to the
        // superadmins until a replacement is appointed.
        res.json({ message: 'Stood down', custodian });
    } catch (error) {
        console.error('[saviour] removeCustodian:', error);
        res.status(500).json({ message: 'Could not remove custodian' });
    }
};

/**
 * PATCH /api/saviour/custodians/:id/folder  { folderId, folderUrl }
 *
 * The custodian connects their own Saviour folder, having just granted the app
 * access to it through the Picker. Storing the id is what lets "move to my
 * Drive" upload straight in. Only the custodian who owns the record (or a
 * superadmin) may set it - the Picker grant is theirs, so the folder must be.
 */
const connectFolder = async (req, res) => {
    try {
        const { folderId, folderUrl } = req.body;
        if (!folderId) return res.status(400).json({ message: 'folderId is required' });

        const custodian = await Custodian.findById(req.params.id);
        if (!custodian) return res.status(404).json({ message: 'No such custodian' });

        const isOwner = custodian.email === req.user.email?.toLowerCase();
        if (!isOwner && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Only this custodian can connect their folder' });
        }

        custodian.driveFolderId = String(folderId).trim();
        if (folderUrl) custodian.driveFolderUrl = String(folderUrl).trim();
        await custodian.save();

        res.json({ custodian });
    } catch (error) {
        console.error('[saviour] connectFolder:', error);
        res.status(500).json({ message: 'Could not connect the folder' });
    }
};

module.exports = { listCustodians, myCustodianships, assignCustodian, removeCustodian, connectFolder };
