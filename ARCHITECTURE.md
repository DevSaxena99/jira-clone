# Architecture & Design Decisions

This document explains every significant architectural choice made in this project — what was chosen, why it was chosen, and what trade-offs were accepted.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Technology Stack Rationale](#2-technology-stack-rationale)
3. [Data Model Design](#3-data-model-design)
4. [Workflow Engine](#4-workflow-engine)
5. [Concurrency & Optimistic Locking](#5-concurrency--optimistic-locking)
6. [Event-Driven Architecture](#6-event-driven-architecture)
7. [Real-Time Layer (WebSockets)](#7-real-time-layer-websockets)
8. [Caching Strategy](#8-caching-strategy)
9. [Authentication & Security](#9-authentication--security)
10. [Search Architecture](#10-search-architecture)
11. [Pagination Strategy](#11-pagination-strategy)
12. [Rate Limiting](#12-rate-limiting)
13. [Error Handling](#13-error-handling)
14. [Project Structure](#14-project-structure)
15. [Trade-offs & Known Limitations](#15-trade-offs--known-limitations)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      HTTP Clients                       │
│              (Swagger UI / REST consumers)              │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP / WebSocket
┌─────────────────▼───────────────────────────────────────┐
│                   Express API Server                    │
│   Routes → Validators → Controllers → Services         │
│                                                         │
│   Middleware stack:                                     │
│   helmet → cors → morgan → rateLimiter → auth → route  │
└──────┬──────────────────────────────┬───────────────────┘
       │ Sequelize ORM                │ Socket.io
┌──────▼──────────┐        ┌──────────▼──────────────────┐
│   MySQL 8       │        │   Socket.io + Redis Adapter │
│   (primary DB)  │        │   (WebSocket rooms + pub/sub│
└─────────────────┘        └──────────────────┬──────────┘
                                              │
┌─────────────────────────────────────────────▼──────────┐
│                      Redis 7                           │
│   • Rate limit counters (per-IP sliding window)        │
│   • JWT blacklist (logout tokens)                      │
│   • Cache (board, project, sprint, user)               │
│   • Presence tracking (who is viewing what)            │
│   • Socket.io pub/sub adapter (horizontal scaling)     │
└────────────────────────────────────────────────────────┘

Internal event flow:
Service → EventBus (Node EventEmitter)
              │
    ┌─────────┼──────────────┐
    ▼         ▼              ▼
Activity  Notification   WebSocket
Listener  Listener       Listener
(writes   (creates       (broadcasts
 audit     in-app         to Socket.io
 log)      notifications) rooms)
```

The architecture is a **single-process event-driven monolith**. One Node.js process handles HTTP, WebSockets, and internal events. Redis handles all shared state so the process can be horizontally scaled behind a load balancer without any code changes.

---

## 2. Technology Stack Rationale

### Node.js 20 + Express 4

**Why:** Node's non-blocking I/O model handles high concurrency naturally — most operations in a project management tool are I/O-bound (database queries, cache lookups), not CPU-bound. A single Node process can handle hundreds of concurrent connections efficiently.

**Why Express over Fastify/Hapi:** Express has the largest ecosystem, most Swagger/OpenAPI tooling support, and the lowest learning curve for team onboarding. The performance difference vs Fastify is negligible when the bottleneck is the database.

### MySQL 8

**Why relational over NoSQL:** The data in a project management tool is highly relational by nature — issues belong to projects, belong to sprints, have transitions, have custom fields, have comments, have watchers. A relational schema enforces referential integrity at the database level. MongoDB would require application-level joins and lose ACID guarantees on multi-table mutations (e.g., transitioning an issue runs a transaction that updates the issue, runs actions, and writes the audit log atomically).

**Why MySQL over PostgreSQL:** MySQL 8 has native FULLTEXT indexing built in, simpler JSON column support for config fields (`action_config`, `validation_config`), and is available on more free-tier hosting providers. PostgreSQL's advantages (better window functions, more index types) are not needed at this scale.

### Sequelize 6

**Why ORM over raw SQL:** Sequelize handles connection pooling, query escaping, migration management, and model associations. For a project of this complexity (19 tables, 100+ associations), raw SQL would be unmaintainable. The ORM cost (slightly more complex queries, N+1 risk) is managed through careful use of `include` and `attributes` to limit what is fetched.

### Redis 7

Redis is used for **five distinct purposes** in this project:

| Purpose | Why Redis |
|---|---|
| Rate limit counters | Atomic `INCR` + `PEXPIRE` — no race conditions |
| JWT blacklist | O(1) key lookup, automatic TTL expiry |
| Response cache | Sub-millisecond reads for hot data |
| Presence tracking | TTL-based cleanup, atomic updates |
| Socket.io adapter | Pub/sub for broadcasting across multiple Node processes |

Using Redis for all five means one less infrastructure dependency. The alternative — separate in-memory stores, a dedicated session store, and a message broker — would add operational complexity without benefit at this scale.

### Socket.io 4

**Why Socket.io over raw WebSockets:** Socket.io provides automatic reconnection, room-based broadcasting, a Redis adapter for multi-process scaling, and graceful fallback to long-polling. The Redis adapter means zero code changes are needed to scale from one to N Node processes — Socket.io handles fan-out automatically.

---

## 3. Data Model Design

### Core Entities

```
users
  id (UUID)         ← UUIDs instead of auto-increment to avoid enumeration attacks
  email (unique)
  password_hash
  display_name
  is_active

projects
  id (UUID)
  owner_id → users
  name
  key (unique)      ← e.g. "PHX" — prefix for all issue keys
  description

project_members     ← join table with role
  project_id → projects
  user_id    → users
  role       ENUM(owner, admin, member)

project_counters    ← separate table for atomic issue key generation
  project_id → projects
  last_value  INT

workflow_statuses
  id, project_id, name, category ENUM(todo,in_progress,in_review,done), position, color

workflow_transitions
  id, project_id, from_status_id, to_status_id
  ← defines the allowed moves in the state machine

workflow_actions
  id, transition_id, action_type, action_config JSON
  ← automated side-effects on transition (assign reviewer, set field, etc.)

workflow_validations
  id, transition_id, validation_type, validation_config JSON
  ← guard conditions that must pass before a transition is allowed

sprints
  id, project_id, name, goal, status ENUM(planned,active,completed)
  start_date, end_date, velocity INT

issues
  id (UUID), project_id, sprint_id, parent_id (self-ref), status_id
  issue_key       ← e.g. "PHX-42" (project.key + counter)
  type            ENUM(epic,story,task,bug,subtask)
  title, description
  priority        ENUM(low,medium,high,critical)
  assignee_id, reporter_id, reviewer_id → users
  story_points INT
  version INT      ← optimistic lock counter
  deleted_at       ← paranoid soft delete

custom_fields
  id, project_id, name, field_type ENUM(text,number,dropdown,date)
  options JSON     ← for dropdown type
  required BOOL

custom_field_values
  id, issue_id, custom_field_id, value TEXT

comments
  id, issue_id, author_id, parent_id (self-ref for threading)
  content TEXT

issue_watchers      ← join table
  issue_id, user_id

activity_logs       ← append-only audit trail
  id, project_id, issue_id, actor_id
  event_type, resource_type, resource_id
  old_value JSON, new_value JSON
  created_at        ← never updated

notifications
  id, user_id, actor_id
  event_type, message, resource_type, resource_id
  read BOOL
```

### Key Design Decisions

**UUIDs as primary keys:** Prevents ID enumeration (an attacker can't guess `GET /api/issues/1001` if the ID is `a3f9b2c1-...`). The slight performance cost vs auto-increment is negligible at this scale.

**Project key counter as a separate table:** Issue keys (`PHX-1`, `PHX-2`) are generated by atomically incrementing `project_counters.last_value` inside a transaction. This avoids race conditions — two simultaneous issue creations cannot get the same key.

**Paranoid (soft) delete:** Sequelize's `paranoid: true` sets `deleted_at` instead of removing the row. Deleted issues still appear in activity logs and audit trails, which is essential for a project management tool where you need to know what happened to deleted work.

**Self-referential comments for threading:** Comments have a `parent_id` pointing to another comment in the same table. This supports arbitrary depth threading without schema changes.

**Workflow as first-class data:** Statuses, transitions, actions, and validations are all stored in the database — not hardcoded. Each project gets its own set of statuses and transition rules seeded on creation. This means the workflow is configurable per project without code changes.

---

## 4. Workflow Engine

The workflow engine is the most complex component. It enforces which status transitions are allowed and runs automated side-effects.

### State Machine

```
[null] ──→ To Do ──→ In Progress ──→ In Review ──→ Done
                           ↑              │
                           └──────────────┘  (back-transition allowed)
```

Transitions are stored as rows in `workflow_transitions(project_id, from_status_id, to_status_id)`. Checking if a transition is valid is a single indexed query — no application-level switch statements.

### Transition Lifecycle

```
POST /api/issues/:id/transition
         │
         ▼
workflowService(issueId, toStatusId, actorId)
         │
         ├── 1. Lock the issue row (SELECT ... FOR UPDATE)
         ├── 2. Find the transition row
         │       └── if not found: return 422 + list of allowed transitions
         ├── 3. Run validation hooks
         │       ├── REQUIRED_FIELD: check issue[field] is not null
         │       ├── ASSIGNEE_REQUIRED: check assignee_id is set
         │       ├── REVIEWER_REQUIRED: check reviewer_id is set
         │       └── CUSTOM_FIELD_REQUIRED: check custom_field_values entry exists
         ├── 4. UPDATE issue SET status_id = ?, version = version + 1
         │       WHERE id = ? AND version = ?   ← optimistic lock
         ├── 5. Run action hooks
         │       ├── ASSIGN_REVIEWER: set reviewer_id
         │       ├── ASSIGN_USER: set assignee_id
         │       └── SET_FIELD: update arbitrary issue field
         └── 6. Emit ISSUE_TRANSITIONED event → audit log + WebSocket broadcast
```

All six steps run inside a single database transaction. If any step fails, the entire transition is rolled back.

### Why This Design

Storing workflow rules in the database (rather than hardcoding them) means:
- Different projects can have different workflows
- Workflows can be edited without code deployment
- Validation and action rules are fully data-driven

---

## 5. Concurrency & Optimistic Locking

### The Problem

Two users open the same issue simultaneously. User A changes the assignee. User B changes the priority. Both read `version: 1`. Both submit a PATCH. Without protection, one write silently overwrites the other.

### The Solution: Optimistic Locking

Every issue has a `version` integer. On every PATCH:

```sql
UPDATE issues
SET title = ?, version = version + 1
WHERE id = ? AND version = ?   ← must match what the client sent
```

If `affectedRows === 0`, the version has changed (someone else wrote first). The API returns `409 CONFLICT` with the current version number. The client must re-fetch and retry.

**Why optimistic over pessimistic locking:** Pessimistic locking (`SELECT ... FOR UPDATE`) holds a database lock for the duration of the request, serializing all concurrent updates on the same row. Under high concurrency this creates a queue and degrades throughput. Optimistic locking assumes conflicts are rare — no lock is held, and only the actual write moment checks for conflict. For a project management tool where simultaneous edits of the exact same issue are uncommon, optimistic locking is the right trade-off.

The same mechanism applies to workflow transitions — the transition update uses `WHERE id = ? AND version = ?` so even concurrent transitions are conflict-detected.

---

## 6. Event-Driven Architecture

### Internal EventBus

```javascript
// eventBus.js
const bus = new EventEmitter()
bus.setMaxListeners(30)
module.exports = bus
```

A single Node.js `EventEmitter` instance shared across the application. Services emit events; listeners consume them.

### Why EventEmitter over Direct Calls

Without an event bus, a service like `issueService.update()` would need to directly call `activityLogService.create()`, `notificationService.create()`, and `websocketService.broadcast()`. This creates tight coupling — the issue service needs to know about every consumer.

With the event bus:
- `issueService` emits `issue:updated` and is done
- `ActivityListener` independently writes the audit log
- `NotificationListener` independently creates notifications
- `WebSocketListener` independently broadcasts to connected clients

Adding a new consumer (e.g., a Slack integration) requires zero changes to `issueService`.

### Event Flow

```
issueService.update()
    │
    └── eventBus.emit('issue:updated', { issue, changes, actorId })
                         │
            ┌────────────┼────────────────┐
            ▼            ▼                ▼
    ActivityListener  NotificationListener  WebSocketListener
    writes audit log  creates notification  broadcasts to
    to activity_logs  for assignee/watchers  project:<id> room
```

### Trade-off

The internal EventEmitter is synchronous and in-process. If the Node process crashes after emitting but before a listener completes, that event is lost. A production-grade system would use a persistent queue (Bull + Redis) so events survive process restarts. This is documented in the "What I'd do with more time" section.

---

## 7. Real-Time Layer (WebSockets)

### Architecture

```
Client A                Server                    Client B
   │                       │                          │
   ├──connect(token)───────▶│                         │
   │                       ├─verify JWT               │
   ├──join:board            │                         │
   │  {projectId}──────────▶│                         │
   │                       ├─socket.join(             │
   │                       │  'project:PHX-id')       │
   │                                                  │
   │  (Client B updates an issue via HTTP)            │
   │                       │◀──────PATCH /issues/:id──│
   │                       ├─emit issue:updated        │
   │                       │  to room 'project:PHX-id'│
   │◀──issue_updated───────│                          │
   │  {id, title, version} │                          │
```

### Room Structure

| Room | Who joins | Events received |
|---|---|---|
| `project:<id>` | Board viewers | `issue_created`, `issue_updated`, `issue_deleted`, `issue_moved`, `sprint_updated` |
| `issue:<id>` | Issue detail viewers | `issue_updated`, `comment_added`, `comment_updated`, `comment_deleted` |
| `user:<id>` | Every authenticated user | `notification:new` |

### Presence Tracking

When a user joins `project:<id>`, their presence is recorded in Redis as a hash:

```
HSET presence:board:<projectId> <userId> <JSON: {displayName, joinedAt}>
EXPIRE presence:board:<projectId> 3600
```

On disconnect, their entry is removed. The `GET /api/projects/:id/presence` endpoint reads this hash and returns who is currently viewing the board.

### Missed Event Replay

When a client reconnects after a network interruption:

```
client emits: replay { projectId, lastEventTimestamp }
server queries: activity_logs WHERE project_id = ? AND created_at >= lastEventTimestamp
server emits: replay { events: [...], count, from }
```

This uses `>=` (not `>`) because MySQL `DATETIME` has 1-second precision — using strict greater-than would miss events in the same second as the disconnect.

### Redis Adapter for Horizontal Scaling

```javascript
io = new Server(server, {
  adapter: createAdapter(pubClient, subClient)
})
```

With the Redis adapter, `io.to('project:abc').emit(...)` works correctly even when connected clients are spread across multiple Node processes. Process A publishes the event to Redis; the adapter on Process B receives it and forwards to its locally connected sockets. Zero application-level changes needed to add more processes.

---

## 8. Caching Strategy

### What is Cached

| Key Pattern | TTL | Invalidated on |
|---|---|---|
| `board:<projectId>` | 60s | Any issue create/update/delete/move in project |
| `project:<id>` | 300s | Project update |
| `sprint:<id>:summary` | 120s | Sprint start/complete or issue move |
| `user:<id>` | 600s | User profile update |

### Cache-Aside Pattern

```javascript
const wrap = async (key, ttlSeconds, fetchFn) => {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)        // cache hit
  const fresh = await fetchFn()                // cache miss → DB query
  await redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds)
  return fresh
}
```

Read path: check Redis → if miss, query MySQL → write result to Redis → return.
Write path: update MySQL → delete the relevant cache key(s).

### Why Cache-Aside Over Write-Through

Write-through caches every write, even for data that is rarely read. Cache-aside only populates the cache on demand — cold data never occupies memory. For a project management tool where read patterns are unpredictable, cache-aside is more memory-efficient.

### What is NOT Cached

Individual issue detail requests are not cached because they are frequently mutated (especially during active sprints) and the cache invalidation logic would need to cover too many scenarios. Only aggregate/summary data with clear invalidation boundaries is cached.

---

## 9. Authentication & Security

### JWT Authentication

```
Register/Login → bcryptjs hash verification → sign JWT(userId, email, exp: 24h)
                                                          │
All subsequent requests: Authorization: Bearer <token>
                         │
                         ▼
auth middleware → jwt.verify() → attach user to req.user
                              → check Redis blacklist (O(1) lookup)
```

**Why JWT over sessions:** JWTs are stateless — the server doesn't need to store session data. Any Node process can verify a token independently, which is essential for horizontal scaling. Sessions require a shared store (Redis or DB) to be accessible from all processes.

**Blacklisting on logout:** When a user logs out, the token is stored in Redis with a TTL matching the token's remaining expiry. Every request checks this blacklist. This adds one Redis lookup per request but allows true logout — otherwise a stolen token would remain valid until expiry.

### Password Security

`bcryptjs` with default salt rounds (10). The hash is stored in `users.password_hash`. The plain password never touches the database.

### Security Middleware Stack

```javascript
app.use(helmet())           // Sets 11 security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(cors({ ... }))      // Restricts origins in production
app.use(rateLimiter)        // Redis-backed sliding window, per-IP
app.use(authMiddleware)     // JWT verification + blacklist check
app.use(authorizeMiddleware) // Project membership check
```

### Authorization Model

Two-level access control:
1. **Authentication** — is the JWT valid and not blacklisted?
2. **Authorization** — is this user a member of the project being accessed?

`authorize.js` middleware is applied to all project-scoped routes. It checks `project_members` for membership. The `owner` role gets additional capabilities (manage members, delete project).

---

## 10. Search Architecture

### Implementation

MySQL 8 FULLTEXT index across three columns:

```sql
ALTER TABLE issues ADD FULLTEXT INDEX ft_issues (title, description);
ALTER TABLE comments ADD FULLTEXT INDEX ft_comments (content);
```

Search query:
```sql
SELECT issues.*, MATCH(title, description) AGAINST(? IN BOOLEAN MODE) AS score
FROM issues
LEFT JOIN comments ON comments.issue_id = issues.id
WHERE issues.project_id IN (/* user's projects */)
  AND MATCH(issues.title, issues.description) AGAINST(? IN BOOLEAN MODE)
     OR MATCH(comments.content) AGAINST(? IN BOOLEAN MODE)
  AND (type = ? IF provided)
  AND (priority = ? IF provided)
  AND (status_id = ? IF provided)
ORDER BY score DESC
```

### Security Scoping

Search results are always filtered to projects the requesting user is a member of. An unauthenticated or unprivileged user cannot search content from projects they don't belong to. This is enforced at the query level, not the application level.

### Supported Query Modes

| Mode | Example | How |
|---|---|---|
| Full-text | `q=OAuth login` | MySQL FULLTEXT BOOLEAN MODE |
| Structured | `type=bug&priority=critical` | SQL WHERE clauses |
| Combined | `q=Safari&type=bug&limit=10` | Both applied together |
| Paginated | `cursor=<encoded>&limit=20` | Cursor-based (see section 11) |

### Why MySQL FULLTEXT over LIKE

`LIKE '%keyword%'` cannot use indexes and causes full table scans. FULLTEXT uses an inverted index — lookup time is proportional to the number of matches, not the table size. FULLTEXT also provides relevance scoring (`MATCH ... AGAINST`) so results can be ordered by how well they match.

---

## 11. Pagination Strategy

### Cursor-Based vs Offset

All list endpoints use **cursor-based pagination** instead of `LIMIT x OFFSET y`.

**Why:** Offset pagination has two problems at scale:
1. `OFFSET 10000` forces the database to scan and discard 10,000 rows
2. If a new item is inserted on page 1 while you're reading page 2, every subsequent page shifts by one — items are missed or duplicated

Cursor pagination encodes the position of the last seen item:

```javascript
// Encode cursor
const cursor = Buffer.from(JSON.stringify({ id: lastItem.id, created_at: lastItem.created_at }))
                     .toString('base64')

// Decode and query
const { id, created_at } = JSON.parse(Buffer.from(cursor, 'base64').toString())
WHERE created_at < ? OR (created_at = ? AND id < ?)  // stable sort
```

The cursor is opaque to the client — they just pass `?cursor=<value>` to get the next page. This is stable regardless of concurrent inserts and requires only an indexed seek rather than a scan-and-discard.

---

## 12. Rate Limiting

### Redis-Backed Sliding Window

```javascript
class RedisStore {
  async increment(key) {
    const pipeline = redis.pipeline()
    pipeline.incr(key)          // atomic increment
    pipeline.pttl(key)          // get remaining TTL
    const [count, pttl] = await pipeline.exec()
    if (pttl === -1) await redis.pexpire(key, this.windowMs)  // set TTL on first hit
    return { totalHits: count, resetTime }
  }
}
```

### Limits

| Limiter | Window | Production limit | Dev/test limit |
|---|---|---|---|
| `apiLimiter` | 60s | 100 req | 2000 req |
| `authLimiter` | 15min | 20 req | 500 req |

Auth endpoints (register, login) have a stricter limit to prevent brute-force attacks.

### Why Redis Over In-Memory

The default `express-rate-limit` in-memory store is per-process. If two Node.js processes are running behind a load balancer, a user can make 100 requests to Process A and 100 requests to Process B — 200 total, bypassing the limit. Redis stores counters centrally, shared across all processes.

---

## 13. Error Handling

### AppError Class

```javascript
class AppError extends Error {
  constructor(message, statusCode, code, meta = {}) {
    super(message)
    this.statusCode = statusCode  // HTTP status
    this.code = code              // machine-readable error code
    this.meta = meta              // additional context
  }
}
```

All errors use typed error codes (e.g., `EMAIL_TAKEN`, `INVALID_TRANSITION`, `CONFLICT`) so clients can handle them programmatically rather than parsing error message strings.

### Consistent Response Shape

**Success:**
```json
{ "data": { ... } }
```

**Error:**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Cannot transition from 'In Progress' to the requested status",
  "meta": { "allowedTransitions": ["In Review"] }
}
```

**Validation error (Joi):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "must be a valid email" }]
}
```

### Global Error Middleware

```javascript
app.use((err, req, res, next) => {
  const status = err.statusCode || 500
  res.status(status).json({
    error:   err.code    || 'INTERNAL_ERROR',
    message: err.message || 'Something went wrong'
  })
})
```

Unhandled promise rejections and unexpected errors are caught here. In production, 500 errors do not leak stack traces to the client.

---

## 14. Project Structure

```
src/
├── config/
│   ├── app.js          ← Express app factory (middleware stack)
│   ├── database.js     ← Sequelize config (dev/test/production)
│   ├── redis.js        ← ioredis client factory (pub/sub clients)
│   └── swagger.js      ← swagger-jsdoc config
│
├── constants/
│   ├── cache.js        ← TTL values and rate limit thresholds
│   ├── errors.js       ← All error code strings (single source of truth)
│   ├── events.js       ← EventBus event name constants
│   ├── issue.js        ← Issue type/priority/status enums
│   ├── notification.js ← Notification type constants
│   ├── roles.js        ← Member role constants
│   └── workflow.js     ← Workflow action/validation type constants
│
├── controllers/        ← HTTP layer: parse req, call service, format res
├── services/           ← Business logic: queries, transactions, event emits
├── models/             ← Sequelize model definitions + associations
├── routes/             ← Express routers + Swagger JSDoc annotations
├── middleware/
│   ├── auth.js         ← JWT verification + blacklist check
│   ├── authorize.js    ← Project membership check
│   ├── errorHandler.js ← Global error formatter
│   ├── rateLimiter.js  ← Redis-backed rate limiting
│   └── validate.js     ← Joi schema validation wrapper
│
├── events/
│   ├── eventBus.js          ← Singleton EventEmitter
│   ├── activityListener.js  ← Writes audit logs
│   ├── notificationListener.js ← Creates in-app notifications
│   └── websocketListener.js ← Broadcasts to Socket.io rooms
│
├── websocket/
│   ├── index.js        ← Socket.io server init + room handlers
│   ├── presence.js     ← Redis-backed presence tracking
│   └── replay.js       ← Missed event replay from activity_logs
│
├── validators/         ← Joi schemas per resource
├── utils/
│   ├── AppError.js     ← Typed error class
│   └── pagination.js   ← Cursor encode/decode helpers
│
├── migrations/         ← Sequelize migration files (schema versioning)
│   └── seeders/        ← Demo data seeders
│
└── server.js           ← HTTP server + Socket.io init + port binding

tests/                  ← Jest + Supertest integration tests
```

### Separation of Concerns

| Layer | Responsibility | Does NOT do |
|---|---|---|
| Route | URL matching, Swagger docs | Business logic |
| Validator | Input shape validation | Authorization |
| Controller | Parse request, call service, format response | Database queries |
| Service | Business logic, DB transactions, event emits | HTTP concerns |
| Model | Schema definition, associations | Business logic |
| Listener | Async side-effects (audit, notify, broadcast) | Direct HTTP responses |

---

## 15. Trade-offs & Known Limitations

### What was optimized for

- **Correctness over raw performance** — optimistic locking, transactional workflow engine, and typed error codes were prioritized over request throughput
- **Extensibility** — the event bus, data-driven workflow, and custom fields make the system easy to extend without schema changes
- **Developer experience** — consistent error shapes, full Swagger documentation, typed constants, and a comprehensive test suite

### Known Limitations

| Limitation | Impact | Mitigation with more time |
|---|---|---|
| Notifications generated synchronously | Adds ~5–20ms latency to every write | Move to Bull async queue |
| Rate limiting is per-IP | Breaks behind NAT/load balancers | Switch to per-user-ID limiting |
| MySQL FULLTEXT has no fuzzy matching | Typos return no results | Replace with Elasticsearch |
| Single-process EventEmitter | Events lost on process crash | Use persistent Redis/Bull queue |
| No read replica | All reads hit the primary | Add MySQL read replica |
| No structured logging | Hard to query logs at scale | Replace morgan with pino + log aggregation |
| Cursor pagination not on all endpoints | Members/labels use simple arrays | Add cursor pagination to all list endpoints |
| No webhook system | Can't integrate with Slack/GitHub/CI | Add webhook subscription + delivery queue |
