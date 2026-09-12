/**
 * Professor endpoints (Saviour)
 *
 * Read-open so the submission form can offer a typeahead; writes are for
 * custodians and admins, who clean up the unverified entries students create
 * while submitting.
 */

const Professor = require('../models/Professor');
const Material = require('../models/Material');

/** GET /api/saviour/professors?q=&department= */
const listProfessors = async (req, res) => {
    try {
        const filters = { status: 'active' };
        if (req.query.department) filters.department = req.query.department.toLowerCase();

        const query = String(req.query.q || '').trim();
        if (query) {
            const normalized = Professor.normalizeName(query);
            filters.$or = [
                { normalizedName: new RegExp(normalized) },
                { aliases: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
            ];
        }

        const professors = await Professor.find(filters)
            .sort({ verified: -1, name: 1 })
            .limit(Math.min(Number(req.query.limit) || 20, 50))
            .lean();

        res.json({ professors });
    } catch (error) {
        console.error('[saviour] listProfessors:', error);
        res.status(500).json({ message: 'Could not load professors' });
    }
};

/** PATCH /api/saviour/professors/:id - rename, verify, add aliases (admin) */
const updateProfessor = async (req, res) => {
    try {
        const professor = await Professor.findById(req.params.id);
        if (!professor) return res.status(404).json({ message: 'No such professor' });

        for (const field of ['name', 'department', 'aliases', 'verified']) {
            if (req.body[field] !== undefined) professor[field] = req.body[field];
        }
        await professor.save();

        res.json({ professor });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'That name already exists in this department' });
        }
        console.error('[saviour] updateProfessor:', error);
        res.status(500).json({ message: 'Could not update professor' });
    }
};

/**
 * POST /api/saviour/professors/:id/merge  { into }
 *
 * Students typing "Dr Sharma", "A. Sharma" and "sharma" create three records.
 * This folds them into one and re-points every material, so a professor's
 * material stays in one pile.
 */
const mergeProfessor = async (req, res) => {
    try {
        const { into } = req.body;
        if (!into) return res.status(400).json({ message: 'Say which professor to merge into' });
        if (into === req.params.id) {
            return res.status(400).json({ message: 'Cannot merge a professor into themselves' });
        }

        const [duplicate, target] = await Promise.all([
            Professor.findById(req.params.id),
            Professor.findById(into),
        ]);
        if (!duplicate || !target) return res.status(404).json({ message: 'No such professor' });

        // Re-point materials, then drop the duplicate id from any that ended up
        // with both (a material tagged with the duplicate and the target).
        await Material.updateMany(
            { professors: duplicate._id },
            { $addToSet: { professors: target._id } }
        );
        await Material.updateMany(
            { professors: duplicate._id },
            { $pull: { professors: duplicate._id } }
        );

        target.aliases = [...new Set([...target.aliases, duplicate.name])];
        await target.save();

        duplicate.status = 'merged';
        duplicate.mergedInto = target._id;
        await duplicate.save();

        res.json({ message: `Merged into ${target.name}`, professor: target });
    } catch (error) {
        console.error('[saviour] mergeProfessor:', error);
        res.status(500).json({ message: 'Could not merge professors' });
    }
};

module.exports = { listProfessors, updateProfessor, mergeProfessor };
