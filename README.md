# Jira Clone — Backend

A production-grade project management platform backend (Jira-like) built for an SDE-1 take-home assignment.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Database Schema (ERD)](#database-schema-erd)
4. [Quick Start — Docker (recommended)](#quick-start--docker-recommended)
5. [Local Development (without Docker)](#local-development-without-docker)
6. [Environment Variables](#environment-variables)
7. [Running Tests](#running-tests)
8. [API Reference](#api-reference)
9. [WebSocket Events](#websocket-events)
10. [Demo Credentials & Seed Data](#demo-credentials--seed-data)
11. [Design Decisions & Trade-offs](#design-decisions--trade-offs)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| ORM | Sequelize 6 |
| Database | MySQL 8 |
| Cache / Pub-Sub | Redis 7 (ioredis) |
| Real-time | Socket.io 4 + `@socket.io/redis-adapter` |
| Auth | JWT (`jsonwebtoken` + `bcryptjs`) |
| Validation | Joi |
| API Docs | Swagger UI (`swagger-jsdoc` + `swagger-ui-express`) |
| Tests | Jest + Supertest |
| Containerisation | Docker + Docker Compose |

---

## Architecture

**Event-Driven Monolith.** Every service writes to MySQL, then emits domain events on an in-process Node.js `EventEmitter` bus. Three stateless listeners consume each event independently:

```
HTTP Request
  └─ Auth MW → Rate Limiter → Joi Validation → Controller
       └─ Service → MySQL (Sequelize) → Redis cache invalidate
            └─ eventBus.emit(event)
                 ├── ActivityListener   → activity_logs  (full audit trail)
                 ├── NotificationListener → notifications (fan-out to watchers)
                 └── WebSocketListener  → Socket.io rooms → Redis Pub/Sub
                                                            → all server instances
```

**WebSocket rooms**

| Room | Joined by | Receives |
|---|---|---|
| `project:<id>` | `join:board` | `issue_created`, `issue_updated`, `issue_deleted`, `issue_moved`, `sprint_updated` |
| `issue:<id>` | `join:issue` | `comment_added`, `comment_updated`, `comment_deleted`, `issue_updated` |
| `user:<id>` | auto on connect | `notification:new` |

---

## Database Schema (ERD)

```
users ──< project_members >──────── projects
                                      ├──< workflow_statuses
                                      ├──< workflow_transitions ──< workflow_actions
                                      ├──< workflow_validations
                                      ├──< sprints ──< issues ──< comments
                                      │                     ├──< issue_labels >── labels
                                      │                     ├──< custom_field_values
                                      │                     └──< issue_watchers
                                      ├──< custom_fields
                                      └──< activity_logs

users ──< notifications
```

**Key columns & constraints**

- `issues.version` — integer incremented on every write for optimistic locking
- `issues.issue_key` — auto-generated (`PROJ-N`), unique per project
- `issues.deleted_at` — soft-delete via Sequelize `paranoid: true`
- `issues.parent_id` — self-referential FK (Epic → Story → Sub-task hierarchy)
- `activity_logs` — append-only; written by `ActivityListener` for every mutation
- FULLTEXT index on `issues(title, description)` and `comments(content)` for search

---

## Quick Start — Docker (recommended)

**Prerequisites:** Docker Desktop ≥ 24, `docker compose` v2.

```bash
# 1. Clone & enter
git clone <repo-url>
cd jira-clone

# 2. Copy environment file (defaults work out of the box)
cp .env.example .env

# 3. Build and start all services
docker compose up -d

# 4. Run database migrations
docker compose exec app npm run db:migrate

# 5. (Optional) Load demo seed data
docker compose exec app npm run db:seed
```

**Services started:**

| Service | URL | Notes |
|---|---|---|
| REST API | http://localhost:3000/api | All endpoints |
| Swagger UI | http://localhost:3000/api-docs | Interactive docs (try every endpoint) |
| Adminer (DB UI) | http://localhost:8080 | MySQL browser |
| MySQL | localhost:3306 | `root` / `secret` / DB: `jiraclone` |
| Redis | localhost:6379 | No auth in dev |

**Useful commands:**

```bash
# View logs
docker compose logs -f app

# Restart the app after code changes
docker compose restart app

# Stop everything
docker compose down

# Full reset (wipe DB + re-seed)
docker compose exec app npm run db:reset
```

---

## Local Development (without Docker)

Requires: Node.js 20, MySQL 8, Redis 7 running locally.

```bash
# Install dependencies
npm install

# Copy env and point to local services
cp .env.example .env
# Edit .env: set DB_HOST=127.0.0.1, REDIS_URL=redis://127.0.0.1:6379

# Run migrations
npm run db:migrate

# (Optional) seed demo data
npm run db:seed

# Start with hot-reload
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` before starting. All variables:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `3000` | HTTP server port |
| `DB_HOST` | `mysql` (Docker) | MySQL hostname |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `jiraclone` | Production database name |
| `DB_NAME_TEST` | `jiraclone_test` | Test database name |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | `secret` | MySQL password |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `JWT_SECRET` | *(see example)* | **Change in production** |
| `JWT_EXPIRES_IN` | `7d` | JWT lifetime |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |

> ⚠️ **Production:** Set a strong random `JWT_SECRET` and restrict `FRONTEND_URL` to your actual frontend domain.

---

## Running Tests

The test suite uses an isolated `jiraclone_test` database. MySQL and Redis must be reachable.

```bash
# Option A — run tests inside Docker (recommended, no extra setup)
docker compose up -d mysql redis
docker compose run --rm -e NODE_ENV=test app npm run db:migrate:test
docker compose run --rm app npm test

# Option B — run tests locally (MySQL + Redis running on host)
npm run db:migrate:test   # creates/migrates jiraclone_test DB
npm test                  # runs all 61 tests

# With coverage report
npm run test:coverage
```

**Test suites (61 tests, 10 suites):**

| Suite | What it covers |
|---|---|
| `auth.test.js` | Register, login, logout, token revocation |
| `projects.test.js` | CRUD, membership, board, workflow, presence, activity |
| `issues.test.js` | CRUD, optimistic locking, transitions, watchers, soft-delete |
| `sprints.test.js` | CRUD, start/complete, velocity, carry-over |
| `comments.test.js` | Threaded comments, ownership guards, @mentions |
| `activity.test.js` | Activity log entries per mutation type |
| `search.test.js` | Full-text, comment search, structured filters, pagination |
| `cache.test.js` | Redis caching + invalidation |
| `websocket.test.js` | Socket.io auth, rooms, all broadcast events |
| `models.test.js` | Sequelize model validations and associations |

---

## API Reference

Full interactive docs at **http://localhost:3000/api-docs** (Swagger UI — try every endpoint directly in the browser).

All endpoints except `POST /api/auth/register` and `POST /api/auth/login` require:

```
Authorization: Bearer <JWT>
```

### Authentication

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ email, password, display_name }` | Create account, returns JWT |
| `POST` | `/api/auth/login` | `{ email, password }` | Returns JWT |
| `POST` | `/api/auth/logout` | — | Blacklists current JWT |

---

### Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List projects the authenticated user belongs to |
| `POST` | `/api/projects` | Create project — auto-seeds 4 workflow statuses & 5 transitions |
| `GET` | `/api/projects/:id` | Get project details |
| `PATCH` | `/api/projects/:id` | Update name / description |
| `GET` | `/api/projects/:id/board` | Kanban board — all statuses with issues grouped |
| `GET` | `/api/projects/:id/workflow` | All workflow statuses and allowed transitions |
| `GET` | `/api/projects/:id/members` | List members with roles |
| `POST` | `/api/projects/:id/members` | Add member `{ user_id, role }` (roles: `owner` `admin` `member` `viewer`) |
| `DELETE` | `/api/projects/:id/members/:userId` | Remove member (owner/admin only) |
| `GET` | `/api/projects/:id/presence` | Who is currently viewing the board |
| `GET` | `/api/projects/:id/activity` | Paginated activity feed (cursor-based) |
| `GET` | `/api/projects/:id/sprints` | List sprints for project |
| `POST` | `/api/projects/:id/sprints` | Create sprint `{ name, goal?, start_date?, end_date? }` |
| `POST` | `/api/projects/:id/issues` | Create issue (see Issue fields below) |
| `GET` | `/api/projects/:id/custom-fields` | List custom field definitions |
| `POST` | `/api/projects/:id/custom-fields` | Create custom field `{ name, field_type, options?, required?, position? }` |
| `PATCH` | `/api/projects/:id/custom-fields/:fieldId` | Update custom field definition |
| `DELETE` | `/api/projects/:id/custom-fields/:fieldId` | Delete custom field definition |

---

### Issues

**Create issue body** (`POST /api/projects/:id/issues`):

```json
{
  "type": "story",
  "title": "User login via OAuth",
  "description": "...",
  "priority": "high",
  "story_points": 8,
  "assignee_id": "<user-uuid>",
  "reporter_id": "<user-uuid>",
  "sprint_id": "<sprint-uuid>",
  "parent_id": "<epic-or-story-uuid>",
  "label_ids": ["<label-uuid>"]
}
```

Valid `type` values: `epic` `story` `task` `bug` `subtask`  
Valid `priority` values: `low` `medium` `high` `critical`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/issues/:id` | Get full issue details (status, assignee, labels, watchers, sprint) |
| `PATCH` | `/api/issues/:id` | Update fields — **must include `version`** (optimistic locking) |
| `DELETE` | `/api/issues/:id` | Soft-delete issue |
| `GET` | `/api/issues/:id/transitions` | List allowed transitions from current status |
| `POST` | `/api/issues/:id/transition` | Transition status `{ to_status_id }` |
| `POST` | `/api/issues/:id/watchers` | Watch issue |
| `DELETE` | `/api/issues/:id/watchers` | Unwatch issue |
| `GET` | `/api/issues/:id/activity` | Issue-level activity log |
| `GET` | `/api/issues/:id/comments` | List comments (threaded, with replies) |
| `POST` | `/api/issues/:id/comments` | Add comment `{ content, parent_id? }` |
| `GET` | `/api/issues/:id/custom-fields` | Get custom field values for this issue |
| `PUT` | `/api/issues/:id/custom-fields/:fieldId` | Set / upsert custom field value `{ value }` |

**Optimistic locking example:**

```bash
# 1. Fetch current version
GET /api/issues/<id>   →  { ..., "version": 3 }

# 2. Update — include version to prevent overwriting concurrent edits
PATCH /api/issues/<id>
{ "version": 3, "title": "New title" }

# Stale write (another client already updated) → 409 CONFLICT
{ "error": "CONFLICT", "currentVersion": 4 }
```

---

### Sprints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sprints/:id` | Get sprint details |
| `PATCH` | `/api/sprints/:id` | Update sprint `{ name?, goal?, start_date?, end_date? }` |
| `POST` | `/api/sprints/:id/start` | Start sprint (status: planned → active) |
| `POST` | `/api/sprints/:id/complete` | Complete sprint — response includes `velocity`, `completedIssues`, `carriedOver` |

**Sprint completion body** (optional):

```json
{ "carryOverIssueIds": ["<issue-uuid>", "..."] }
```

Incomplete issues not in `carryOverIssueIds` remain in backlog. Velocity = sum of `story_points` for issues in `Done` status.

---

### Comments

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/api/comments/:id` | Edit comment (author only) |
| `DELETE` | `/api/comments/:id` | Delete comment (author only) |

---

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | List notifications for authenticated user |
| `GET` | `/api/notifications/unread-count` | `{ "count": N }` |
| `PATCH` | `/api/notifications/:id/read` | Mark single notification read |
| `POST` | `/api/notifications/mark-all-read` | Mark all notifications read |

**Notification triggers:**

| Trigger | Recipients |
|---|---|
| Issue assigned (via `PATCH`) | New assignee |
| Issue status changed | Watchers |
| Comment added with `@mention` | Mentioned users |
| Comment added | Issue watchers |

---

### Search

```
GET /api/search?q=OAuth&type=story&status=In+Progress&assignee=<userId>&priority=high&projectId=<id>&limit=20&cursor=<cursor>
```

| Query Param | Type | Description |
|---|---|---|
| `q` | string | Full-text search across issue titles, descriptions, **and comment content** |
| `type` | string | Filter by issue type |
| `status` | string | Filter by status name |
| `assignee` | uuid | Filter by assignee user ID |
| `priority` | string | Filter by priority |
| `projectId` | uuid | Scope to a single project |
| `limit` | integer | Page size (default 20, max 100) |
| `cursor` | string | Opaque cursor from previous response's `pagination.nextCursor` |

At least one parameter is required. Results are scoped to the requesting user's project memberships — no cross-project data leaks.

---

## WebSocket Events

**Connect:**

```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  auth: { token: '<JWT>' }   // or query: { token: '...' }
})
```

**Room management:**

```javascript
socket.emit('join:board',  { projectId })   // subscribe to board events
socket.emit('leave:board', { projectId })

socket.emit('join:issue',  { issueId })     // subscribe to issue-level events
socket.emit('leave:issue', { issueId })
```

**Inbound events (server → client):**

Most board/issue events use a shared envelope shape:

```javascript
{
  event:      'issue_created',      // event name string
  resourceId: 'PROJ-42',           // issue_key or sprint/comment ID
  actorId:    '<user-uuid>',
  timestamp:  '2026-01-16T09:30:00.000Z',
  data:       { /* event-specific fields — see table below */ }
}
```

| Event | Room | `data` fields |
|---|---|---|
| `issue_created` | `project:<id>` | `{ id, issue_key, type, title, status, priority }` |
| `issue_updated` | `project:<id>` + `issue:<id>` | `{ id, title, priority, assignee, status, version }` |
| `issue_deleted` | `project:<id>` | `{ id }` |
| `issue_moved` | `project:<id>` | `{ id, sprint_id }` |
| `comment_added` | `issue:<id>` | `{ comment_id, content }` |
| `comment_updated` | `issue:<id>` | `{ comment_id }` |
| `comment_deleted` | `issue:<id>` | `{ comment_id }` |
| `sprint_updated` | `project:<id>` | `{ sprint_id, status, velocity? }` |
| `presence:update` | `project:<id>` | `{ viewers: [{ userId, displayName, joinedAt }] }` (no envelope) |
| `notification:new` | `user:<id>` | `{ id, event_type, message, resource_type, resource_id, created_at }` (no envelope) |
| `replay` | direct | `{ events: [...activityLogs], count, from }` (no envelope) |

**Missed-event replay (reconnect pattern):**

```javascript
socket.on('connect', () => {
  socket.emit('join:board', { projectId })

  // Request events missed while disconnected
  socket.emit('replay', {
    projectId,
    lastEventTimestamp: '2026-01-16T09:00:00.000Z'
  })
})

socket.on('replay', ({ events, count, from }) => {
  console.log(`Replaying ${count} missed events since ${from}`)
  events.forEach(applyEvent)
})
```

**Presence tracking:**

```javascript
socket.on('presence:update', ({ viewers }) => {
  // viewers = [{ userId, displayName, joinedAt }, ...]
  updateBoardPresenceUI(viewers)
})
```

---

## Demo Credentials & Seed Data

After running `npm run db:seed`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | Password1! |
| Developer | dev1@demo.com | Password1! |
| Developer | dev2@demo.com | Password1! |

The seed creates:
- 1 demo project (`DEMO`) with full workflow
- 1 active sprint with 8 sample issues across all types and statuses
- Sample comments and activity logs
- Labels: `frontend`, `backend`, `bug`, `enhancement`

---

## Design Decisions & Trade-offs

### Optimistic locking over pessimistic locking

`issues.version` is incremented atomically on every write. Two concurrent updates result in a `409 CONFLICT` for the second writer, which receives `currentVersion` in the response so it can re-fetch, merge, and retry. This keeps all API requests lock-free and scales horizontally without connection-held locks.

### MySQL FULLTEXT over Elasticsearch / Meilisearch

`MATCH(title, description, comments.content) AGAINST ('+term*' IN BOOLEAN MODE)` handles prefix search, boolean operators, and phrase queries at zero additional ops cost. The search logic is fully encapsulated in `searchService.js` — swapping to Elasticsearch is a targeted change to one file with no API surface changes.

### Cursor pagination over OFFSET

`WHERE (created_at, id) <= (?, ?)` is O(log n) regardless of page depth and is stable under concurrent inserts (OFFSET shifts under inserts). The cursor is a base64-encoded `(created_at, id)` tuple returned in every paginated response as `pagination.nextCursor`.

### Redis for presence tracking (not in-memory Maps)

In-memory Maps die on restart and cannot be shared across Node.js instances. Redis hashes with a 1-hour TTL survive restarts, survive deployments, and work correctly with the Socket.io Redis adapter for horizontal scaling. The `PRESENCE_TTL_SEC` constant controls the expiry window.

### Event-driven monolith over microservices

The internal `EventEmitter` bus provides the same decoupling benefit (activity logging, notifications, and WebSocket broadcasts are all independent of business logic) without network latency, distributed transactions, or deployment overhead. The bus can be swapped for Redis Streams or Kafka if the team outgrows single-process throughput — the contract is `eventBus.emit(eventName, payload)` and `eventBus.on(...)`.

### Workflow engine design

Each project stores its own set of `workflow_statuses` and `workflow_transitions`, so teams can configure different workflows per project. The engine enforces only allowed transitions (`422 INVALID_TRANSITION` on violation), supports automatic `workflow_actions` (e.g., auto-assign reviewer) and `workflow_validations` (e.g., require required fields before transitioning to Done). When a project is created, a sensible default workflow (To Do → In Progress → In Review → Done) is seeded automatically.

### Soft-delete on Issues

`issues.deleted_at` via Sequelize `paranoid: true` retains the row for audit trail and activity-log integrity. All queries automatically exclude soft-deleted rows via Sequelize's built-in scope.

---

## Project Structure

```
src/
├── app.js                  # Express app factory
├── server.js               # HTTP + Socket.io bootstrap
├── config/
│   ├── app.js              # Express middleware setup
│   ├── database.js         # Sequelize connection
│   ├── redis.js            # ioredis client (main + pub/sub pair)
│   └── swagger.js          # Swagger-jsdoc config
├── constants/              # Shared enums (events, roles, errors, etc.)
├── controllers/            # Thin request/response handlers
├── events/
│   ├── eventBus.js         # Node.js EventEmitter singleton
│   ├── activityListener.js # Writes activity_logs
│   ├── notificationListener.js # Fans out notifications
│   └── websocketListener.js    # Broadcasts to Socket.io rooms
├── middleware/
│   ├── auth.js             # JWT verification + blacklist check
│   ├── authorize.js        # Project membership + role guard
│   ├── errorHandler.js     # Centralized AppError handler
│   ├── rateLimiter.js      # express-rate-limit with Redis store
│   └── validate.js         # Joi schema validation
├── migrations/             # Sequelize migrations (schema + indexes)
│   └── seeders/            # Demo data seeders
├── models/                 # Sequelize models + associations
├── routes/                 # Express routers + Swagger JSDoc annotations
├── services/               # Business logic layer
│   ├── authService.js
│   ├── cacheService.js     # Redis get/set/del + key helpers
│   ├── issueService.js
│   ├── projectService.js
│   ├── sprintService.js
│   ├── commentService.js
│   ├── notificationService.js
│   ├── searchService.js    # FULLTEXT + structured SQL
│   ├── workflowService.js  # Transition engine
│   └── customFieldService.js
├── utils/
│   ├── AppError.js         # Structured error class
│   └── pagination.js       # Cursor encode/decode helpers
└── websocket/
    ├── index.js            # Socket.io server setup + event handlers
    ├── presence.js         # Redis-backed presence tracking
    └── replay.js           # Missed-event replay from activity_logs
tests/                      # Jest + Supertest integration tests (61 tests)
docker/
└── mysql/
    └── init.sql            # Creates jiraclone_test DB on first run
```
