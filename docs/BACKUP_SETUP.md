# MongoDB Backup System Setup

## Overview

This backup system automatically creates:
- **Daily backups**: Every day at 2 AM UTC, kept for 10 days
- **Monthly backups**: 1st of each month at 3 AM UTC, kept for 12 months

Backups are stored in a separate MongoDB database as JSON documents.

---

## Setup Instructions

### 1. Create a Backup MongoDB Database

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and sign in
2. Create a **new project** (e.g., "InternAtIITR-Backups")
3. Create a **free tier cluster** (M0 Sandbox)
4. Create a database user with read/write access
5. Whitelist `0.0.0.0/0` for IP access (or Vercel's IPs)
6. Get the connection string

### 2. Add Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

```env
# Backup MongoDB connection string
BACKUP_MONGO_URI=mongodb+srv://username:password@backup-cluster.xxxxx.mongodb.net/backups

# Secret for cron job authentication (generate a random string)
CRON_SECRET=your-random-secret-string-here
```

**Generate a secure CRON_SECRET:**
```bash
# Run in terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Add backup system"
git push
```

Vercel will automatically:
- Run daily backup at 2:00 AM UTC (7:30 AM IST)
- Run monthly backup on 1st at 3:00 AM UTC (8:30 AM IST)

---

## Manual Backup

You can trigger backups manually:

### Via API (as superadmin)
```bash
# Daily backup
curl -X POST https://your-domain.vercel.app/api/backup/daily \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Monthly backup
curl -X POST https://your-domain.vercel.app/api/backup/monthly \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Via Cron Secret (for testing)
```bash
curl -X POST https://your-domain.vercel.app/api/backup/daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## View Backups

### List all backups (superadmin only)
```
GET /api/backup/list
```

Returns:
```json
{
  "count": 15,
  "backups": [
    {
      "id": "...",
      "type": "daily",
      "date": "2024-12-26",
      "createdAt": "2024-12-26T02:00:00Z",
      "stats": {
        "users": 150,
        "questions": 500,
        "companies": 50,
        "tips": 200
      }
    }
  ]
}
```

---

## Restore from Backup

To restore, use the restore function in `server/services/backup.js`:

```javascript
const { restoreBackup } = require('./services/backup');

// Restore to a target database
await restoreBackup(
    process.env.BACKUP_MONGO_URI,
    'mongodb+srv://...target-db-uri...',
    'backup-document-id'
);
```

⚠️ **Warning**: Restore will INSERT documents. Clear the target collection first if you want a clean restore.

---

## Backup Structure

Each backup is stored as a single MongoDB document:

```json
{
  "_id": "ObjectId",
  "type": "daily",
  "date": "2024-12-26",
  "month": "2024-12",
  "createdAt": "2024-12-26T02:00:00Z",
  "collections": ["users", "questions", "companies", "tips"],
  "stats": {
    "users": 150,
    "questions": 500,
    "companies": 50,
    "tips": 200
  },
  "data": {
    "users": [...all user documents...],
    "questions": [...all question documents...],
    "companies": [...all company documents...],
    "tips": [...all tip documents...]
  }
}
```

---

## Retention Policy

| Type | Retention | Cleanup |
|------|-----------|---------|
| Daily | 10 days | Automatic after each backup |
| Monthly | 365 days (~12 months) | Automatic after each backup |

---

## Monitoring

Check backup status in Vercel:
1. Go to your Vercel project
2. Click on "Logs"
3. Filter by "Cron"

You'll see logs like:
```
📦 Starting daily backup...
✅ Connected to source database
✅ Connected to backup database
  📄 users: 150 documents
  📄 questions: 500 documents
  📄 companies: 50 documents
  📄 tips: 200 documents
✅ daily backup saved successfully
🔌 Database connections closed
```

---

## Troubleshooting

### "Backup not configured"
- Check `BACKUP_MONGO_URI` is set in Vercel environment variables
- Redeploy after adding environment variables

### "Connection failed"
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify username/password in connection string
- Ensure database user has readWrite permissions

### Cron not running
- Vercel crons require Pro/Enterprise plan
- Alternative: Use [cron-job.org](https://cron-job.org) (free) to call the endpoints
