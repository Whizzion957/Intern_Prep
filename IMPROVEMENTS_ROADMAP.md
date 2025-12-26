# Intern At IITR - Security & Improvements Roadmap

This document outlines all recommended improvements for security, scalability, and features.

---

## ✅ COMPLETED Security Improvements

### 1. Edit/Delete Access Control ✅
**Status:** IMPLEMENTED

- Owner-only edits/deletes enforced
- Admin override capability
- Ownership transfer feature (search by enrollment)
- Hidden ownership history trail

---

### 2. Rate Limiting Content Creation ✅
**Status:** IMPLEMENTED (Redis-based)

**Limits:**
| Action | User Limit | Admin Limit |
|--------|------------|-------------|
| Questions | 10/day | 50/day |
| Companies | 5/day | 25/day |
| Tips | 20/day | 100/day |

**Features:**
- Upstash Redis integration
- Graceful fallback if Redis unavailable
- Rate limit status API endpoint
- Frontend quota display on AddQuestion page

---

### 3. XSS Protection ✅
**Status:** IMPLEMENTED

- DOMPurify installed and integrated
- Created `sanitize.js` utility
- All 6 `dangerouslySetInnerHTML` locations sanitized:
  - CompanyDetail.jsx (4 places)
  - QuestionDetail.jsx (2 places)

---

### 4. API Rate Limiting (DDoS Protection) ✅
**Status:** IMPLEMENTED

```javascript
// General API limit: 200 requests per 15 minutes
// Auth limit: 10 requests per 15 minutes (brute force protection)
```

---

### 5. NoSQL Injection Protection ✅
**Status:** IMPLEMENTED

```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

---

### 6. Response Compression ✅
**Status:** IMPLEMENTED

```javascript
const compression = require('compression');
app.use(compression());
```

---

### 7. Question Numbering ✅
**Status:** IMPLEMENTED

- Auto-generated sequential numbers per company (Google #1, #2, etc.)
- Migration script for existing questions
- Displayed on QuestionCard and QuestionDetail

---

### 8. Visited Questions Tracking ✅
**Status:** IMPLEMENTED

- Green tick on visited question cards
- Persists across sessions (stored in User model)
- Automatic marking when viewing question detail

---

## 🟡 REMAINING: Data Protection

### 9. Automated Database Backups ✅
**Status:** IMPLEMENTED

- Daily backups at 2 AM UTC (kept for 10 days)
- Monthly backups at 3 AM UTC on 1st (kept for 12 months)
- Stored in separate MongoDB database
- Triggered via cron-job.org
- Backup/restore functions available

---

### 10. Admin Activity Logging ✅
**Status:** IMPLEMENTED

**Actions logged:**
- User login/logout
- Question create/edit/delete/transfer
- Company create/edit
- Tip create/edit/delete
- Admin role changes
- System errors (with debug info)

**Features:**
- 30-day auto-delete (TTL index)
- Admin-only Activity Logs page at `/admin/logs`
- Filters by action, date range, user, errors
- Stats dashboard (total, today, errors)
- Click log for full details modal
- IP address and user agent tracking

---

### 11. Input Validation
- Role changes
- Ownership transfers
- Content deletions
- Batch operations

| Task | Effort | Priority |
|------|--------|----------|
| Create AdminLog model | 30 min | ⬛ Select |
| Add logging middleware | 1 hr | ⬛ Select |
| Create admin log API endpoint | 1 hr | ⬛ Select |
| Add Activity Log UI in Admin Panel | 2 hrs | ⬛ Select |

---

### 11. Input Validation
**Current Issue:** Limited backend validation of user inputs.

| Task | Effort | Priority |
|------|--------|----------|
| Install express-validator | 5 min | ⬛ Select |
| Add validators to question routes | 1 hr | ⬛ Select |
| Add validators to company routes | 1 hr | ⬛ Select |
| Add validators to admin routes | 30 min | ⬛ Select |

---

## 🟢 REMAINING: Performance

### 12. Database Indexing
**Current Issue:** Queries may slow down as data grows.

```javascript
// Suggested indexes
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

### 13. Response Caching
**Current Issue:** Same data fetched repeatedly.

| Task | Effort | Priority |
|------|--------|----------|
| Add in-memory cache for branch lists | 30 min | ⬛ Select |
| Add Redis caching layer | 4 hrs | ⬛ Select |

---

## 📋 Summary

### ✅ Completed (8 items)
1. Owner-only edits with transfer
2. Redis rate limiting
3. XSS protection (DOMPurify)
4. API rate limiting (DDoS)
5. NoSQL injection protection
6. Response compression
7. Question numbering
8. Visited questions tracking

### 🔲 Remaining (5 items)
1. Database backups
2. Admin activity logging
3. Input validation (express-validator)
4. Database indexing
5. Response caching

---

## 💡 What Each Feature Does

| Feature | Protection Against |
|---------|-------------------|
| **Owner-only edits** | Unauthorized data modification/deletion |
| **Redis rate limiting** | Content flooding, spam |
| **XSS protection** | Malicious script injection via user content |
| **API rate limiting** | DDoS attacks, brute force login attempts |
| **NoSQL injection** | MongoDB query injection attacks |
| **Response compression** | Bandwidth waste, slow page loads |
| **Question numbering** | Better organization and reference |
| **Visited tracking** | Better UX, know what you've read |
