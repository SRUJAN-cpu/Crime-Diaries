# Crime Intelligence Platform — Future Collections Implementation Plan

## Overview
This document outlines three **optional collections** for future development beyond Week 1-2 MVP. Add them when needed, not before.

---

## 1. AUDIT LOGS COLLECTION

### When to Implement
**Week 3-4** (If compliance requirement emerges)

### Why It's Needed
- **Regulatory Compliance:** Karnataka Police may require audit trails for sensitive data access
- **Investigation Audits:** "Who queried what criminal's data on which date?"
- **Security Monitoring:** Detect suspicious query patterns (e.g., accessing unrelated cases)
- **Debugging:** Track system failures and performance issues
- **Accountability:** "This analyst accessed 50 criminals in 1 hour — flag for review"

### Schema
```
AuditLogs {
  _id: ObjectId (PK)
  catalyst_user_id: String (indexed)
  user_name: String (denormalized for readability)
  department: String (denormalized)
  
  action_type: String (enum)
    - "text_to_sql_query"
    - "rag_search"
    - "network_query"
    - "risk_scoring"
    - "pdf_export"
  
  query_text: String (what user asked)
  sql_generated: String (if applicable)
  
  results_count: Number (how many records returned)
  response_time_ms: Number (backend latency)
  
  created_at: String (ISO 8601, indexed)
  ip_address: String
  status: String (enum: "success", "error", "partial")
  error_message: String (if status="error")
  
  ttl: Number (90 days in seconds = 7776000)
}
```

### Indexes
```
catalyst_user_id: 1, created_at: -1 (composite, for "get user's activity")
status: 1 (single, for filtering errors)
created_at: 1 (with expireAfterSeconds: 7776000 for auto-delete)
```

### Query Examples
```javascript
// Get all activity by one user in last 7 days
AuditLogs.find({
  catalyst_user_id: "user_5",
  created_at: { $gte: "2024-01-03T00:00:00Z" }
})
.sort({ created_at: -1 })

// Compliance check: Find all queries on a specific criminal
AuditLogs.find({
  query_text: { $regex: "criminal_c_001" }
})

// Detect suspicious behavior: Queries per user per hour
AuditLogs.aggregate([
  {
    $group: {
      _id: { user: "$catalyst_user_id", hour: { $dateToString: { format: "%Y-%m-%dT%H", date: "$created_at" } } },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 20 } } }  // More than 20 queries/hour
])
```

### TTL Strategy
- **90 days (7776000 seconds):** Balances compliance (3-month audit trail) with storage cost
- **Auto-delete:** Database removes old logs automatically, no manual cleanup
- **Trade-off:** Can't analyze trends beyond 90 days (solution: aggregate summaries before TTL expires)

### Implementation Effort
- **Backend:** 2-3 hours (log every query operation)
- **Frontend:** 1 hour (optional: admin audit log viewer)
- **Testing:** 2 hours

---

## 2. SAVED SEARCHES COLLECTION

### When to Implement
**Week 4-5** (If user testing shows investigators want to bookmark queries)

### Why It's Needed
- **Reusability:** "I crafted the perfect query last week. Can I run it again?"
- **Collaboration:** "Share my analysis template with teammates (future)"
- **Efficiency:** Stop rewriting the same query every week
- **Documentation:** "What questions have we already answered about this case?"
- **Pattern Recognition:** Investigators can see they keep asking the same question → suggests it's important

### Schema
```
SavedSearches {
  _id: ObjectId (PK)
  catalyst_user_id: String (indexed)
  
  title: String (required, user-provided)
    Example: "Top gang leaders by convictions - Bangalore 2024"
  
  description: String (optional)
  query_type: String (enum)
    - "text_to_sql"
    - "rag_search"
    - "network_analysis"
  
  original_query: String (what user typed)
    Example: "Who are the top gang leaders in Bangalore?"
  
  generated_sql: String (if applicable, the SQL we ran)
  
  filters: Object (structured filters for re-execution)
    {
      location: "Bangalore",
      crime_category: "gang_violence",
      date_range: { from: "2024-01-01", to: "2024-01-31" },
      risk_level: "high"
    }
  
  last_executed_at: String (ISO 8601)
  execution_count: Number (how many times user ran this)
  last_result_count: Number (cached: how many results last time)
  
  is_pinned: Boolean (favorite/star flag for quick access)
  
  tags: Array<String>
    Example: ["gang_violence", "bangalore", "2024", "network_analysis"]
  
  created_at: String (ISO 8601)
  updated_at: String (ISO 8601)
}
```

### Indexes
```
catalyst_user_id: 1, updated_at: -1 (composite, for "show my saved searches")
is_pinned: 1 (single, for "show my starred searches")
tags: 1 (single, for tag-based filtering)
```

### Query Examples
```javascript
// Get all my saved searches
SavedSearches.find({ catalyst_user_id: "user_5" })
  .sort({ updated_at: -1 })

// Get my pinned searches (sidebar quick access)
SavedSearches.find({
  catalyst_user_id: "user_5",
  is_pinned: true
})

// Search by tag
SavedSearches.find({
  catalyst_user_id: "user_5",
  tags: "gang_violence"
})

// Most-executed searches (trending analyses)
SavedSearches.find({ catalyst_user_id: "user_5" })
  .sort({ execution_count: -1 })
  .limit(10)
```

### Re-execution Pattern
```javascript
// User clicks "Run saved search"
const saved = SavedSearches.findOne({ _id: savedSearchId })

// Optionally apply new filters (update date range, location, etc.)
const query = buildQueryWithFilters(saved.filters, userOverrides)

// Execute the query (same as normal)
const results = await runQuery(query)

// Update last_executed_at and execution_count
SavedSearches.updateOne(
  { _id: savedSearchId },
  {
    $set: { last_executed_at: new Date().toISOString(), last_result_count: results.length },
    $inc: { execution_count: 1 }
  }
)
```

### TTL Strategy
- **No TTL:** Investigators revisit old analyses; saved searches are permanent
- **Data retention:** Keep searches for the lifetime of the investigation

### Implementation Effort
- **Backend:** 3-4 hours (save/load/update searches, re-execution logic)
- **Frontend:** 4-5 hours (UI for saved searches sidebar, pin/unpin, run again)
- **Testing:** 2-3 hours

---

## 3. SESSIONS COLLECTION (Optional)

### When to Implement
**Never (unless you need custom session analytics)**

Catalyst Auth already manages session lifecycle. Only add this if you want to track:
- Device information (laptop vs mobile)
- Session-level analytics
- Multi-device logout
- Concurrent session limits

### Why It Might Be Needed
- **Analytics:** "How many investigators are online right now?"
- **Device tracking:** "This user is logging in from a new device — flag for security?"
- **Logout from other devices:** "Logout from all tabs except this one"
- **Session limits:** "Prevent more than 3 concurrent sessions per user"

### Schema
```
Sessions {
  _id: ObjectId (PK)
  catalyst_user_id: String (indexed)
  
  token_hash: String (hashed JWT token, for revocation if needed)
  
  created_at: String (ISO 8601, indexed)
  last_activity_at: String (ISO 8601, updated on every request)
  expires_at: String (ISO 8601, when session expires)
  
  device_info: Object (optional)
    {
      user_agent: "Mozilla/5.0...",
      device_type: "laptop|mobile|tablet",
      browser: "Chrome",
      os: "Windows 10"
    }
  
  ip_address: String
  location: String (geolocation, if available)
  
  ttl: Number (86400 for 24-hour auto-delete)
}
```

### Indexes
```
catalyst_user_id: 1, created_at: -1 (composite)
created_at: 1 (with expireAfterSeconds: 86400 for auto-delete)
```

### Query Examples
```javascript
// Get all active sessions for a user
Sessions.find({
  catalyst_user_id: "user_5",
  expires_at: { $gt: new Date().toISOString() }
})

// Count concurrent users right now
Sessions.aggregate([
  {
    $match: {
      expires_at: { $gt: new Date().toISOString() }
    }
  },
  {
    $group: {
      _id: null,
      concurrent_users: { $sum: 1 }
    }
  }
])

// Logout from all other devices
Sessions.deleteMany({
  catalyst_user_id: "user_5",
  _id: { $ne: currentSessionId }
})
```

### TTL Strategy
- **24 hours (86400 seconds):** Auto-delete inactive sessions
- **Reason:** Clean up stale data; Catalyst Auth handles session validation
- **Trade-off:** No long-term session history (not needed if you don't need it)

### Implementation Effort
- **Backend:** 4-5 hours (middleware to create/update sessions)
- **Frontend:** 1-2 hours (optional: session management UI)
- **Testing:** 2 hours

---

## Implementation Roadmap

### Week 1-2 (MVP)
- ✅ Users
- ✅ Conversations
- ❌ All optional collections

### Week 3-4 (If feedback arrives)
- ❓ **Audit Logs** — Only if law enforcement says "we need compliance trails"
  - Sign: Investigator asks "Can you prove who accessed this data?"
  - Priority: Add if required
  
- ❓ **Saved Searches** — Only if testers say "I want to save my queries"
  - Sign: Investigator opens same conversation multiple times, runs similar queries
  - Priority: Add if saves time

### Week 5+ (Polish)
- ❌ **Sessions** — Skip unless you need device tracking or multi-device logout

---

## Decision Framework

Ask yourself before implementing:

### Audit Logs
- [ ] Does our law enforcement client require compliance trails?
- [ ] Are there regulatory (IPC/state) requirements to log data access?
- [ ] Is this a security concern for our users?

**YES to any?** → Implement Week 3

### Saved Searches
- [ ] Do testers keep asking the same questions repeatedly?
- [ ] Would bookmarking queries save investigator time?
- [ ] Is query complexity high enough to warrant saving?

**YES to 2+?** → Implement Week 4

### Sessions
- [ ] Do we need device-level analytics?
- [ ] Must we support "logout from other devices"?
- [ ] Do we need to limit concurrent sessions per user?

**YES to any?** → Implement (but low priority)

---

## Storage Estimates

| Collection | Avg Doc Size | 1K Users | 100K Users |
|---|---|---|---|
| Users | 400 B | 400 KB | 40 MB |
| Conversations (100 avg per user) | 10 KB | 1 GB | 100 GB |
| Audit Logs (1K logs per user, 90-day TTL) | 600 B | 600 MB → 0 | 60 GB → 0 |
| Saved Searches (50 avg per user) | 2 KB | 100 MB | 10 GB |
| Sessions (active, 24h TTL) | 500 B | 500 KB → 0 | 50 MB → 0 |

**TTL = auto-deletes, so storage stays constant**

---

## Summary

| Collection | Add When | Effort | Priority | Storage Impact |
|---|---|---|---|---|
| **Audit Logs** | Compliance required | 5-6 hrs | Medium | Auto-purged (90d) |
| **Saved Searches** | User requests bookmarks | 9-10 hrs | Low | Grows with usage |
| **Sessions** | Multi-device mgmt needed | 6-8 hrs | Low | Auto-purged (24h) |

**Recommendation:** Start with Users + Conversations. Get user feedback. Add based on actual needs, not "what if" scenarios.