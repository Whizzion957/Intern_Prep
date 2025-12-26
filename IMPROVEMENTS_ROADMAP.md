# Intern At IITR - Security & Improvements Roadmap

This document outlines all recommended improvements for security, scalability, and features. Select which items to implement.

---

## 🔴 CRITICAL: Security Issues

### 1. Edit/Delete Access Control
**Current Issue:** Anyone can edit or delete any question, risking DB destruction.

**Solution:** Re-enable owner-only edits with ownership transfer feature.

```javascript
// Add to Question model
originalSubmittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Original author
transferHistory: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
}]
```

**Admin Ownership Transfer Endpoint:**
```javascript
// PUT /api/admin/questions/:id/transfer
// Only superadmin can transfer ownership
body: { newOwnerId: "userId" }
```

| Task | Effort | Priority |
|------|--------|----------|
| Add `originalSubmittedBy` field | 30 min | ⬛ Select |
| Create transfer ownership API | 1 hr | ⬛ Select |
| Re-enable owner-only delete in middleware | 30 min | ⬛ Select |
| Update frontend to show original author | 1 hr | ⬛ Select |

---

### 2. Rate Limiting Content Creation
**Current Issue:** Users can flood DB with unlimited questions, companies, tips.

**Solution:** Add rate limits per user per action type.

```javascript
// Suggested limits
const contentLimits = {
    questions: { max: 10, windowHrs: 24 },    // 10 questions/day
    companies: { max: 5, windowHrs: 24 },     // 5 companies/day
    tips: { max: 20, windowHrs: 24 },         // 20 tips/day
    replies: { max: 50, windowHrs: 24 }       // 50 replies/day
};
```

**Implementation Options:**

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A. In-memory rate limit | Simple, works for single server | Resets on restart | 2 hrs |
| B. MongoDB rate tracking | Persistent, accurate | Adds DB queries | 4 hrs |
| C. Redis rate limiting | Fast, scalable | Requires Redis setup | 6 hrs |

| Task | Effort | Priority |
|------|--------|----------|
| Option A: Basic express-rate-limit per endpoint | 2 hrs | ⬛ Select |
| Option B: User daily limit tracking in DB | 4 hrs | ⬛ Select |
| Option C: Redis-based solution | 6 hrs | ⬛ Select |

---

### 3. XSS Protection (dangerouslySetInnerHTML)
**Current Issue:** 6 places render HTML without sanitization - XSS risk.

**Solution:** Add DOMPurify sanitization.

**Files to update:**
- `CompanyDetail.jsx` (4 places)
- `QuestionDetail.jsx` (2 places)

```javascript
import DOMPurify from 'dompurify';
// Before: dangerouslySetInnerHTML={{ __html: content }}
// After:  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
```

| Task | Effort | Priority |
|------|--------|----------|
| Install dompurify | 5 min | ⬛ Select |
| Create sanitize utility function | 15 min | ⬛ Select |
| Update all 6 locations | 30 min | ⬛ Select |

---

### 4. API Rate Limiting (DDoS Protection)
**Current Issue:** No request rate limiting - vulnerable to API abuse.

**Solution:**
```javascript
const rateLimit = require('express-rate-limit');

// General API limit
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    message: 'Too many requests, please try again later'
});

// Strict auth limit (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10
});
```

| Task | Effort | Priority |
|------|--------|----------|
| Install express-rate-limit | 5 min | ⬛ Select |
| Add API limiter to index.js | 15 min | ⬛ Select |
| Add stricter auth limiter | 15 min | ⬛ Select |

---

### 5. NoSQL Injection Protection
**Current Issue:** No sanitization against MongoDB injection attacks.

**Solution:**
```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

| Task | Effort | Priority |
|------|--------|----------|
| Install & add express-mongo-sanitize | 10 min | ⬛ Select |

---

### 6. Input Validation
**Current Issue:** Limited backend validation of user inputs.

**Solution:** Add express-validator to all POST/PUT routes.

| Task | Effort | Priority |
|------|--------|----------|
| Install express-validator | 5 min | ⬛ Select |
| Add validators to question routes | 1 hr | ⬛ Select |
| Add validators to company routes | 1 hr | ⬛ Select |
| Add validators to admin routes | 30 min | ⬛ Select |

---

## 🟡 IMPORTANT: Data Protection

### 7. Automated Database Backups
**Current Issue:** No version control or backup system.

**Solution Options:**

#### Option A: MongoDB Atlas Automated Backups (Recommended)
- Enable in Atlas dashboard
- Point-in-time recovery available
- ✅ Pros: Zero code, managed by MongoDB
- ❌ Cons: Requires paid tier for continuous backup

#### Option B: Custom Backup Script (Self-hosted/Free tier)
```javascript
// backup.js - Run via cron job
const { exec } = require('child_process');
const cron = require('node-cron');

// Every 4 hours
cron.schedule('0 */4 * * *', () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cmd = `mongodump --uri="${MONGO_URI}" --out="./backups/${timestamp}"`;
    exec(cmd, (error, stdout) => {
        // Log to admin dashboard
    });
});
```

#### Option C: Question Edit History (Soft Version Control)
```javascript
// Add to Question model
editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    previousContent: { type: String },
    changeType: { type: String, enum: ['edit', 'delete', 'restore'] }
}],
isDeleted: { type: Boolean, default: false } // Soft delete
```

| Task | Effort | Priority |
|------|--------|----------|
| Option A: Enable Atlas backups | 15 min | ⬛ Select |
| Option B: Custom backup script + cron | 3 hrs | ⬛ Select |
| Option C: Add edit history to models | 4 hrs | ⬛ Select |
| Soft delete instead of hard delete | 2 hrs | ⬛ Select |

---

### 8. Admin Activity Logging
**Current Issue:** No audit trail of admin actions.

**Solution:** Create admin log system.

```javascript
// models/AdminLog.js
const adminLogSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: { type: String, enum: ['user', 'question', 'company', 'tip'] },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Logged actions:
// - Role changes (user promoted/demoted)
// - Ownership transfers
// - Content deletions
// - Batch operations
```

**Admin Dashboard Addition:**
- New "Activity Log" tab showing all admin actions
- Filter by admin, action type, date range
- Export to CSV

| Task | Effort | Priority |
|------|--------|----------|
| Create AdminLog model | 30 min | ⬛ Select |
| Add logging middleware | 1 hr | ⬛ Select |
| Create admin log API endpoint | 1 hr | ⬛ Select |
| Add Activity Log UI in Admin Panel | 2 hrs | ⬛ Select |

---

## 🟢 ENHANCEMENTS: Scalability

### 9. Database Indexing
**Current Issue:** Queries may slow down as data grows.

```javascript
// Add to models
questionSchema.index({ company: 1, createdAt: -1 });
questionSchema.index({ submittedBy: 1 });
questionSchema.index({ '$**': 'text' }); // Full-text search
companySchema.index({ name: 'text' });
```

| Task | Effort | Priority |
|------|--------|----------|
| Add indexes to Question model | 15 min | ⬛ Select |
| Add indexes to Company model | 15 min | ⬛ Select |

---

### 10. Response Caching
**Current Issue:** Same data fetched repeatedly.

**Solution:** Cache frequently accessed, rarely changed data.

```javascript
// Cache candidates:
// - Branch lists (never changes) - 24hr cache
// - Company list (rarely changes) - 5min cache
// - Question stats - 1min cache
```

| Task | Effort | Priority |
|------|--------|----------|
| Add in-memory cache for branch lists | 30 min | ⬛ Select |
| Add Redis caching layer | 4 hrs | ⬛ Select |

---

### 11. Response Compression
**Current Issue:** Large responses not compressed.

```javascript
const compression = require('compression');
app.use(compression());
```

| Task | Effort | Priority |
|------|--------|----------|
| Install & add compression middleware | 10 min | ⬛ Select |

---

## 📋 Implementation Priority Matrix

### Phase 1: Critical Security (Do First)
- [ ] Re-enable owner-only edits
- [ ] Add ownership transfer feature
- [ ] Add API rate limiting
- [ ] Add XSS sanitization (DOMPurify)
- [ ] Add NoSQL injection protection

### Phase 2: Content Protection
- [ ] Add per-user content rate limits
- [ ] Implement soft deletes
- [ ] Add edit history tracking
- [ ] Enable database backups

### Phase 3: Admin Tools
- [ ] Create admin activity logging
- [ ] Add activity log UI
- [ ] Add content moderation tools

### Phase 4: Performance
- [ ] Add database indexes
- [ ] Enable response compression
- [ ] Add caching layer

---

## 💰 Effort Summary

| Category | Total Effort | Items |
|----------|--------------|-------|
| Critical Security | ~4 hrs | 5 items |
| Content Protection | ~6 hrs | 4 items |
| Admin Tools | ~5 hrs | 4 items |
| Performance | ~5 hrs | 4 items |
| **Total** | **~20 hrs** | **17 items** |

---

## ✅ Quick Wins (< 30 min each)
1. Install express-rate-limit
2. Install express-mongo-sanitize  
3. Install DOMPurify + update 6 files
4. Install compression middleware
5. Enable MongoDB Atlas backups (if using Atlas)

---

**Instructions:** Mark items with ✅ to select for implementation, then share this document back for me to implement the selected improvements.
