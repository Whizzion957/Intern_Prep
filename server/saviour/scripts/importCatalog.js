/**
 * Course catalog importer (Saviour)
 *
 * The catalog is entered by hand, once per department, from the official
 * curriculum. This turns that spreadsheet into Course documents.
 *
 *     node saviour/scripts/importCatalog.js saviour/scripts/catalog.sample.csv
 *     node saviour/scripts/importCatalog.js catalog.csv --dry-run
 *
 * CSV columns (header row required):
 *   name,codes,departments,credits,owningDepartment,aliases
 *
 * `codes` - semicolon separated, each entry CODE[:from[:until]]. The LAST entry
 * is the current code.
 *
 *   "CSN-102:2018:2023;CSC-201:2024"   old code retired in 2023, new one since 2024
 *   "CSC-201"                          never renamed
 *
 * `departments` - who takes it, and in which semester for each. A course can be
 * institute-wide, shared by a few branches, or specific to one:
 *
 *   "all:1"        every branch, semester 1   (first-year maths, humanities)
 *   "cs:3;mfs:3"   shared by two branches
 *   "me:5"         one branch only
 *
 * The semester is per branch on purpose - the same course sits in different
 * semesters for different branches.
 *
 * Re-running is safe: a course whose code already exists is updated, not
 * duplicated, so adding a rename later is just an edit to the CSV.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Course = require('../models/Course');
const { normalizeCode } = require('../services/courseCodes');

/** Minimal CSV reader: handles quoted fields and embedded commas. */
const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];

        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            quoted = true;
        } else if (char === ',') {
            row.push(field.trim());
            field = '';
        } else if (char === '\n') {
            row.push(field.trim());
            if (row.some(Boolean)) rows.push(row);
            row = [];
            field = '';
        } else if (char !== '\r') {
            field += char;
        }
    }

    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);

    const [header, ...body] = rows;
    return body.map((cells) =>
        Object.fromEntries(header.map((key, index) => [key.trim(), cells[index] ?? '']))
    );
};

/**
 * "all:1" -> { allDepartments: true, defaultSemester: 1, offeredTo: [] }
 * "cs:3;mfs:3" -> { allDepartments: false, offeredTo: [{department, semester}] }
 */
const parseDepartments = (raw) => {
    const entries = String(raw || '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const [department, semester] = part.split(':').map((piece) => piece.trim());
            return {
                department: department.toLowerCase(),
                semester: semester ? Number(semester) : null,
            };
        });

    const institute = entries.find((entry) => entry.department === 'all');
    if (institute) {
        return { allDepartments: true, offeredTo: [], defaultSemester: institute.semester };
    }

    return {
        allDepartments: false,
        offeredTo: entries,
        // Handy fallback for a branch that isn't listed explicitly
        defaultSemester: entries[0]?.semester ?? null,
    };
};

/** "CSN-102:2018:2023;CSC-201:2024" -> [{code, from, until, current}] */
const parseCodes = (raw) => {
    const entries = String(raw || '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const [code, from, until] = part.split(':').map((piece) => piece.trim());
            return {
                code: code.toUpperCase(),
                from: from ? Number(from) : null,
                until: until ? Number(until) : null,
                current: false,
            };
        });

    if (entries.length > 0) entries[entries.length - 1].current = true;
    return entries;
};

const run = async () => {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const file = args.find((arg) => !arg.startsWith('--'));

    if (!file) {
        console.error('Usage: node saviour/scripts/importCatalog.js <catalog.csv> [--dry-run]');
        process.exit(1);
    }

    const csvPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(csvPath)) {
        console.error(`No such file: ${csvPath}`);
        process.exit(1);
    }

    const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    console.log(`Read ${rows.length} rows from ${path.basename(csvPath)}`);

    if (!dryRun) {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('Connected to MongoDB');
    }

    const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };

    for (const [index, row] of rows.entries()) {
        const line = index + 2; // +1 for the header, +1 for 1-based lines
        const codes = parseCodes(row.codes);

        const scope = parseDepartments(row.departments);

        if (!row.name || codes.length === 0 || (!scope.allDepartments && scope.offeredTo.length === 0)) {
            console.warn(`  line ${line}: needs name, codes and departments - skipped`);
            summary.skipped += 1;
            continue;
        }

        const payload = {
            name: row.name,
            ...scope,
            owningDepartment: row.owningDepartment
                ? row.owningDepartment.toLowerCase()
                : (scope.offeredTo[0]?.department ?? null),
            credits: row.credits ? Number(row.credits) : null,
            codes,
            aliases: (row.aliases || '')
                .split(';')
                .map((alias) => alias.trim())
                .filter(Boolean),
        };

        const codeList = codes.map((entry) => entry.code).join(', ');

        if (dryRun) {
            console.log(`  would import ${codeList} - ${payload.name}`);
            summary.created += 1;
            continue;
        }

        try {
            const existing = await Course.findOne({
                normalizedCodes: { $in: codes.map((entry) => normalizeCode(entry.code)) },
            });

            if (existing) {
                Object.assign(existing, payload);
                await existing.save();
                summary.updated += 1;
                console.log(`  updated ${codeList} - ${payload.name}`);
            } else {
                await Course.create(payload);
                summary.created += 1;
                console.log(`  created ${codeList} - ${payload.name}`);
            }
        } catch (error) {
            summary.failed += 1;
            console.error(`  line ${line} (${codeList}): ${error.message}`);
        }
    }

    console.log(
        `\nDone. created ${summary.created}, updated ${summary.updated}, `
        + `skipped ${summary.skipped}, failed ${summary.failed}`
        + (dryRun ? '  (dry run, nothing written)' : '')
    );

    if (!dryRun) await mongoose.disconnect();
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
