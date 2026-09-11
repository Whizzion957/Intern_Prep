/**
 * Migration Script: Channel-i -> Google Sign-In
 *
 * - Lowercases stored emails (users are now matched by email)
 * - Fills in `department` from each user's IITR email subdomain
 * - Replaces the unique enrollmentNumber index with one that ignores users
 *   without an enrollment number (Google sign-in doesn't provide it)
 * - Warns about users sharing an email address
 *
 * Safe to run more than once.
 * Run with: node scripts/migrateToGoogleAuth.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { parseIitrEmail } = require('../services/accessControl');

const migrate = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('ERROR: No MongoDB URI found in environment variables.');
            console.error('Please ensure MONGO_URI or MONGODB_URI is set in your .env file.');
            process.exit(1);
        }

        await mongoose.connect(mongoUri, { autoIndex: false });
        console.log('Connected to MongoDB');

        const users = mongoose.connection.db.collection('users');

        // 1. Normalize emails
        const normalized = await users.updateMany(
            { email: { $type: 'string' } },
            [{ $set: { email: { $toLower: { $trim: { input: '$email' } } } } }]
        );
        console.log(`Normalized emails: ${normalized.modifiedCount} users updated`);

        // 2. Fill in department from email subdomain
        let departmentsSet = 0;
        const nonIitr = [];
        for await (const user of users.find({}, { projection: { email: 1, department: 1 } })) {
            const parsed = parseIitrEmail(user.email);
            if (!parsed) {
                nonIitr.push(user.email || '(no email)');
                continue;
            }
            if (user.department !== parsed.department) {
                await users.updateOne({ _id: user._id }, { $set: { department: parsed.department } });
                departmentsSet++;
            }
        }
        console.log(`Departments set: ${departmentsSet} users updated`);
        if (nonIitr.length) {
            console.log(`Users without a valid IITR email (they won't be able to log in): ${nonIitr.length}`);
            nonIitr.slice(0, 20).forEach((email) => console.log(`  - ${email}`));
        }

        // 3. Replace enrollmentNumber index
        const indexes = await users.indexes();
        const oldIndex = indexes.find((index) => index.name === 'enrollmentNumber_1');
        if (oldIndex && !oldIndex.partialFilterExpression) {
            await users.dropIndex('enrollmentNumber_1');
            console.log('Dropped old enrollmentNumber_1 index');
        }
        await users.createIndex(
            { enrollmentNumber: 1 },
            { unique: true, partialFilterExpression: { enrollmentNumber: { $type: 'string' } } }
        );
        await users.createIndex({ email: 1 });
        console.log('Created partial unique enrollmentNumber index and email index');

        // 4. Warn about duplicate emails
        const duplicates = await users.aggregate([
            { $match: { email: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$email', count: { $sum: 1 }, enrollments: { $push: '$enrollmentNumber' } } },
            { $match: { count: { $gt: 1 } } },
        ]).toArray();
        if (duplicates.length) {
            console.log(`\nWARNING: ${duplicates.length} emails are shared by multiple users.`);
            console.log('Login will use the oldest account; merge or fix these manually:');
            duplicates.forEach((d) => console.log(`  - ${d._id}: ${d.enrollments.join(', ')}`));
        }

        console.log('\nMigration complete');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

migrate();
