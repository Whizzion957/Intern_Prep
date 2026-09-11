/**
 * Link Seeded Placeholder Accounts to Real Emails
 *
 * Seeded users (utils/seedUsers.js) have made-up emails like 23114010@iitr.ac.in,
 * so Google sign-in can't match them. For each entry below:
 * - If nobody else has the real email: set it on the placeholder, so the student's
 *   first Google sign-in opens the account that already owns their content.
 * - If a real account already has that email: move the placeholder's content to it.
 *
 * Dry run by default (changes nothing). Add --apply to write.
 * Run with: node scripts/linkPlaceholderEmails.js [--apply]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { parseIitrEmail } = require('../services/accessControl');

const LINKS = [
    { enrollmentNumber: '23114010', email: 'arnav_g@cs.iitr.ac.in' },
    { enrollmentNumber: '23114093', email: 'siddharth_g@cs.iitr.ac.in' },
    { enrollmentNumber: '23114037', email: 'harshit_km@cs.iitr.ac.in' },
    { enrollmentNumber: '23114015', email: 'barot_mh@cs.iitr.ac.in' },
    { enrollmentNumber: '23114025', email: 'drishti_g@cs.iitr.ac.in' },
    { enrollmentNumber: '23114046', email: 'kartik_g@cs.iitr.ac.in' },
    { enrollmentNumber: '23114097', email: 'suprajeet_s@cs.iitr.ac.in' },
];

// Collections and fields that reference a user as owner
const OWNED = [
    ['questions', 'submittedBy'],
    ['companytips', 'author'],
    ['resources', 'submittedBy'],
    ['companies', 'addedBy'],
];

const PLACEHOLDER_EMAIL = /^\d+@iitr\.ac\.in$/i;

const link = async () => {
    const apply = process.argv.includes('--apply');
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('ERROR: No MongoDB URI found in environment variables.');
            console.error('Please ensure MONGO_URI or MONGODB_URI is set in your .env file.');
            process.exit(1);
        }

        await mongoose.connect(mongoUri, { autoIndex: false });
        const db = mongoose.connection.db;
        const users = db.collection('users');

        console.log(apply ? '=== APPLYING CHANGES ===\n' : '=== DRY RUN (no changes; add --apply to write) ===\n');

        for (const { enrollmentNumber, email } of LINKS) {
            const parsed = parseIitrEmail(email);
            const placeholder = await users.findOne({ enrollmentNumber });

            if (!parsed) {
                console.log(`SKIP ${enrollmentNumber}: "${email}" is not a valid IITR email`);
                continue;
            }
            if (!placeholder) {
                console.log(`SKIP ${enrollmentNumber}: no user with this enrollment number`);
                continue;
            }
            if (placeholder.email === parsed.email) {
                console.log(`DONE ${enrollmentNumber} ${placeholder.fullName}: already linked to ${parsed.email}`);
                continue;
            }
            if (!PLACEHOLDER_EMAIL.test(placeholder.email || '')) {
                console.log(`SKIP ${enrollmentNumber} ${placeholder.fullName}: has a real email already (${placeholder.email}), not touching it`);
                continue;
            }

            const existing = await users.findOne({ email: parsed.email, _id: { $ne: placeholder._id } });

            if (!existing) {
                console.log(`LINK ${enrollmentNumber} ${placeholder.fullName}: ${placeholder.email} -> ${parsed.email}`);
                if (apply) {
                    await users.updateOne(
                        { _id: placeholder._id },
                        { $set: { email: parsed.email, department: parsed.department } }
                    );
                }
                continue;
            }

            // Student already has a real account: move the placeholder's content there
            console.log(`MOVE ${enrollmentNumber} ${placeholder.fullName}: content -> existing account "${existing.fullName}" (${parsed.email})`);
            for (const [collection, field] of OWNED) {
                const count = await db.collection(collection).countDocuments({ [field]: placeholder._id });
                if (!count) continue;
                console.log(`       ${collection}: ${count}`);
                if (apply) {
                    await db.collection(collection).updateMany(
                        { [field]: placeholder._id },
                        { $set: { [field]: existing._id } }
                    );
                }
            }
        }

        console.log(apply ? '\nChanges applied.' : '\nDry run complete. No changes were made.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Link failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

link();
