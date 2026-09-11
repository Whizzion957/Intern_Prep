/**
 * Audit Script: Readiness for Google Sign-In (READ-ONLY, changes nothing)
 *
 * Google sign-in matches existing users by email. This reports which users
 * will be matched and which won't, and how much content the unmatched ones own.
 *
 * Run with: node scripts/auditUsersForGoogleAuth.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { parseIitrEmail, departmentName } = require('../services/accessControl');

const PLACEHOLDER_EMAIL = /^\d+@iitr\.ac\.in$/i;

// Classify a stored email the same way login will see it
const classify = (user) => {
    if (user.enrollmentNumber === 'SYSTEM') return 'system';
    const email = String(user.email || '').trim();
    if (!email) return 'empty';
    if (PLACEHOLDER_EMAIL.test(email)) return 'placeholder';
    const parsed = parseIitrEmail(email);
    if (!parsed) return 'non_iitr';
    return parsed.department ? 'ok' : 'ok_no_department';
};

const LABELS = {
    ok: 'Will match (IITR email with department)',
    ok_no_department: 'Will match, but no department in email (blocked if departments are restricted)',
    placeholder: 'Seeded placeholder, never logged in (e.g. 23114002@iitr.ac.in) - claimed via enrollment number in Google name',
    empty: 'No email stored - WILL NOT MATCH',
    non_iitr: 'Non-IITR email stored - WILL NOT MATCH',
    system: 'SYSTEM user (not a person, ignored)',
};

const audit = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('ERROR: No MongoDB URI found in environment variables.');
            console.error('Please ensure MONGO_URI or MONGODB_URI is set in your .env file.');
            process.exit(1);
        }

        await mongoose.connect(mongoUri, { autoIndex: false });
        const db = mongoose.connection.db;

        const users = await db.collection('users')
            .find({}, { projection: { fullName: 1, enrollmentNumber: 1, email: 1, role: 1, createdAt: 1, updatedAt: 1 } })
            .toArray();

        // Content owned per user
        const countBy = async (collection, field) => {
            const rows = await db.collection(collection).aggregate([
                { $match: { [field]: { $ne: null } } },
                { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            ]).toArray();
            return new Map(rows.map((r) => [String(r._id), r.count]));
        };
        const [questions, tips, resources, companies] = await Promise.all([
            countBy('questions', 'submittedBy'),
            countBy('companytips', 'author'),
            countBy('resources', 'submittedBy'),
            countBy('companies', 'addedBy'),
        ]);
        const contentOf = (id) => ({
            questions: questions.get(String(id)) || 0,
            tips: tips.get(String(id)) || 0,
            resources: resources.get(String(id)) || 0,
            companies: companies.get(String(id)) || 0,
        });
        const totalContent = (c) => c.questions + c.tips + c.resources + c.companies;

        // 1. Summary by category
        const groups = {};
        for (const user of users) {
            (groups[classify(user)] ||= []).push(user);
        }
        console.log(`\n=== USERS: ${users.length} total ===`);
        for (const key of Object.keys(LABELS)) {
            if (groups[key]) console.log(`${String(groups[key].length).padStart(5)}  ${LABELS[key]}`);
        }

        // 2. Departments among matchable users
        const departments = {};
        for (const user of groups.ok || []) {
            const code = parseIitrEmail(user.email).department;
            departments[code] = (departments[code] || 0) + 1;
        }
        console.log('\n=== DEPARTMENTS (from email subdomain) ===');
        Object.entries(departments)
            .sort((a, b) => b[1] - a[1])
            .forEach(([code, count]) => console.log(`${String(count).padStart(5)}  ${code.padEnd(6)} ${departmentName(code)}`));

        // 3. Duplicate emails
        const byEmail = {};
        for (const user of users) {
            const email = String(user.email || '').trim().toLowerCase();
            if (email) (byEmail[email] ||= []).push(user);
        }
        const duplicates = Object.entries(byEmail).filter(([, list]) => list.length > 1);
        console.log(`\n=== DUPLICATE EMAILS: ${duplicates.length} ===`);
        duplicates.forEach(([email, list]) => {
            console.log(`  ${email}`);
            list.forEach((u) => console.log(`     - ${u.fullName} | ${u.enrollmentNumber || '-'} | ${u.role} | content: ${totalContent(contentOf(u._id))}`));
        });

        // 4. Unmatched users that own content (these need fixing before switching)
        const unmatched = [...(groups.placeholder || []), ...(groups.empty || []), ...(groups.non_iitr || [])];
        const withContent = unmatched
            .map((u) => ({ user: u, content: contentOf(u._id) }))
            .filter((row) => totalContent(row.content) > 0)
            .sort((a, b) => totalContent(b.content) - totalContent(a.content));

        console.log(`\n=== UNMATCHED USERS OWNING CONTENT: ${withContent.length} (of ${unmatched.length} unmatched) ===`);
        console.log('enrollment | name | stored email | role | questions | tips | resources | companies');
        withContent.forEach(({ user, content }) => {
            console.log([
                user.enrollmentNumber || '-', user.fullName, user.email || '(empty)', user.role,
                content.questions, content.tips, content.resources, content.companies,
            ].join(' | '));
        });

        // 5. Admins, so you can check they'll keep access
        const admins = users.filter((u) => u.role === 'admin' || u.role === 'superadmin');
        console.log(`\n=== ADMINS / SUPERADMINS: ${admins.length} ===`);
        admins.forEach((u) => {
            const status = classify(u).startsWith('ok') ? 'Will match (admins are never blocked)' : LABELS[classify(u)];
            console.log(`  ${u.role.padEnd(10)} ${u.fullName} | ${u.enrollmentNumber || '-'} | ${u.email || '(empty)'} | ${status}`);
        });

        console.log('\nNo changes were made.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Audit failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

audit();
