/**
 * MongoDB Backup System
 * 
 * Creates automated backups to a separate MongoDB database.
 * Works in serverless environments (Vercel).
 * 
 * - Daily backups: Keep 10 days, delete older
 * - Monthly backups: Keep 12 months, delete older
 * 
 * Usage: Call via Vercel Cron or external cron service
 */

const mongoose = require('mongoose');

// Collections to backup
const COLLECTIONS_TO_BACKUP = ['users', 'questions', 'companies', 'tips'];

/**
 * Connect to a MongoDB database
 */
const connectToDb = async (uri, name) => {
    const connection = await mongoose.createConnection(uri).asPromise();
    console.log(`✅ Connected to ${name} database`);
    return connection;
};

/**
 * Get all documents from a collection
 */
const getCollectionData = async (connection, collectionName) => {
    const collection = connection.collection(collectionName);
    const documents = await collection.find({}).toArray();
    return documents;
};

/**
 * Create a backup document
 */
const createBackupDocument = (type, data, collections) => {
    const now = new Date();
    return {
        type, // 'daily' or 'monthly'
        createdAt: now,
        date: now.toISOString().split('T')[0], // YYYY-MM-DD
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, // YYYY-MM
        collections: collections,
        stats: Object.fromEntries(
            Object.entries(data).map(([name, docs]) => [name, docs.length])
        ),
        data: data,
    };
};

/**
 * Clean up old backups based on retention policy
 */
const cleanupOldBackups = async (backupCollection, type, maxAge) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const result = await backupCollection.deleteMany({
        type: type,
        createdAt: { $lt: cutoffDate },
    });

    if (result.deletedCount > 0) {
        console.log(`🗑️ Deleted ${result.deletedCount} old ${type} backup(s)`);
    }

    return result.deletedCount;
};

/**
 * Check if backup already exists for today/this month
 */
const backupExists = async (backupCollection, type, identifier) => {
    const query = type === 'daily'
        ? { type: 'daily', date: identifier }
        : { type: 'monthly', month: identifier };

    const existing = await backupCollection.findOne(query);
    return !!existing;
};

/**
 * Run the backup process
 */
const runBackup = async (sourceUri, backupUri, backupType = 'daily') => {
    let sourceConnection = null;
    let backupConnection = null;

    try {
        console.log(`\n📦 Starting ${backupType} backup...`);
        console.log(`⏰ Time: ${new Date().toISOString()}`);

        // Connect to both databases
        sourceConnection = await connectToDb(sourceUri, 'source');
        backupConnection = await connectToDb(backupUri, 'backup');

        const backupDb = backupConnection.db;
        const backupCollection = backupDb.collection('backups');

        // Check if backup already exists
        const now = new Date();
        const dateIdentifier = now.toISOString().split('T')[0];
        const monthIdentifier = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const identifier = backupType === 'daily' ? dateIdentifier : monthIdentifier;

        const exists = await backupExists(backupCollection, backupType, identifier);
        if (exists) {
            console.log(`⏭️ ${backupType} backup for ${identifier} already exists. Skipping.`);
            return { skipped: true, identifier };
        }

        // Backup each collection
        const backupData = {};
        const sourceDb = sourceConnection.db;

        for (const collName of COLLECTIONS_TO_BACKUP) {
            try {
                const docs = await getCollectionData(sourceDb, collName);
                backupData[collName] = docs;
                console.log(`  📄 ${collName}: ${docs.length} documents`);
            } catch (err) {
                console.warn(`  ⚠️ Could not backup ${collName}: ${err.message}`);
                backupData[collName] = [];
            }
        }

        // Create and save backup document
        const backupDoc = createBackupDocument(backupType, backupData, COLLECTIONS_TO_BACKUP);
        await backupCollection.insertOne(backupDoc);
        console.log(`✅ ${backupType} backup saved successfully`);

        // Cleanup old backups
        const retentionDays = backupType === 'daily' ? 10 : 365; // 10 days or ~12 months
        await cleanupOldBackups(backupCollection, backupType, retentionDays);

        // Return stats
        return {
            success: true,
            type: backupType,
            date: backupDoc.date,
            stats: backupDoc.stats,
        };

    } catch (error) {
        console.error(`❌ Backup failed:`, error.message);
        throw error;
    } finally {
        // Close connections
        if (sourceConnection) await sourceConnection.close();
        if (backupConnection) await backupConnection.close();
        console.log('🔌 Database connections closed\n');
    }
};

/**
 * List available backups
 */
const listBackups = async (backupUri) => {
    let connection = null;
    try {
        connection = await connectToDb(backupUri, 'backup');
        const backupCollection = connection.db.collection('backups');

        const backups = await backupCollection
            .find({}, { projection: { data: 0 } }) // Exclude data for listing
            .sort({ createdAt: -1 })
            .toArray();

        return backups;
    } finally {
        if (connection) await connection.close();
    }
};

/**
 * Restore from a backup
 */
const restoreBackup = async (backupUri, targetUri, backupId) => {
    let backupConnection = null;
    let targetConnection = null;

    try {
        backupConnection = await connectToDb(backupUri, 'backup');
        const backupCollection = backupConnection.db.collection('backups');

        // Find the backup
        const backup = await backupCollection.findOne({
            _id: new mongoose.Types.ObjectId(backupId)
        });

        if (!backup) {
            throw new Error(`Backup ${backupId} not found`);
        }

        console.log(`📥 Restoring from backup: ${backup.date} (${backup.type})`);

        targetConnection = await connectToDb(targetUri, 'target');
        const targetDb = targetConnection.db;

        // Restore each collection
        for (const [collName, docs] of Object.entries(backup.data)) {
            if (docs.length > 0) {
                const collection = targetDb.collection(collName);

                // Option: Clear collection first (uncomment if needed)
                // await collection.deleteMany({});

                await collection.insertMany(docs);
                console.log(`  ✅ Restored ${collName}: ${docs.length} documents`);
            }
        }

        return { success: true, restored: backup.stats };

    } finally {
        if (backupConnection) await backupConnection.close();
        if (targetConnection) await targetConnection.close();
    }
};

module.exports = {
    runBackup,
    listBackups,
    restoreBackup,
    COLLECTIONS_TO_BACKUP,
};
