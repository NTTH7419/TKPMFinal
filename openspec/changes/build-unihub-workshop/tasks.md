## 1. Monorepo & Project Setup [All — Week 1]

- [x] 1.1 Initialize pnpm monorepo: create `pnpm-workspace.yaml` and root `package.json` with workspace scripts
- [x] 1.2 Create `apps/api` with NestJS CLI: `nest new api --skip-git`
- [x] 1.3 Create `apps/student-web` with Vite React: `npm create vite@latest student-web -- --template react-ts`
- [x] 1.4 Create `apps/admin-web` with Vite React: `npm create vite@latest admin-web -- --template react-ts`
- [x] 1.5 Create `apps/checkin-pwa` with Vite React and configure `vite-plugin-pwa`; initial pages: Login, WorkshopSelect, Scan (placeholder)
- [x] 1.6 Create `packages/shared` with TypeScript: DTOs, enums (Role, WorkshopStatus, RegistrationStatus, PaymentStatus, NotificationChannel), shared constants
- [x] 1.7 Provision Supabase project: obtain `DATABASE_URL` (connection pooling URL), `SUPABASE_URL`, `SUPABASE_ANON_KEY`; create Storage buckets: `workshop-docs`, `student-imports`, `qr-codes`
- [x] 1.8 Run Prisma migration against Supabase PostgreSQL: `npx prisma migrate dev` to create all tables per the ERD schema (users, roles, user_roles, students, workshops, registrations, payments, checkin_events, workshop_documents, student_import_batches, student_import_rows, notification_events, notification_deliveries)
- [x] 1.9 Setup Redis via Docker Compose: create `docker-compose.yml` with `redis:7-alpine`, port 6379, AOF persistence enabled
- [x] 1.10 Configure `.env` for the API: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, REDIS_URL (redis://localhost:6379), JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, HMAC_QR_SECRET, HMAC_WEBHOOK_SECRET, RESEND_API_KEY
- [x] 1.11 Configure ESLint + Prettier across the entire workspace

## 2. Auth/RBAC Module [Person A — Week 1–2]

- [x] 2.1 Create `AuthModule` in NestJS: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [x] 2.2 Implement bcrypt password hashing (cost 12) and verification on login
- [x] 2.3 Implement JWT access token generation (15-min TTL, payload: user_id, roles[], iat, exp)
- [x] 2.4 Implement refresh token generation (7-day TTL, payload: user_id, jti, exp) and set as HTTP-only cookie
- [x] 2.5 Implement refresh token rotation: verify jti is not in Redis blocklist, issue new token pair, revoke old token by storing jti in Redis with TTL = remaining lifetime
- [x] 2.6 Create `JwtAuthGuard` (NestJS guard) to verify the access token on all protected endpoints
- [x] 2.7 Create `RolesGuard` and `@Roles()` decorator to enforce RBAC per role
- [x] 2.8 Create `AuditLogService` to write records for: login attempts, role changes, workshop create/update/cancel, token revocation
- [x] 2.9 Create `UsersModule`: `POST /admin/users/:id/roles` (ADMIN assigns/removes roles); log role changes via `AuditLogService`
- [x] 2.10 Write unit tests: successful login, wrong password, locked account, role guard enforcement, refresh token rotation
- [x] 2.11 Implement `POST /auth/register`: allow students to self-register with email + password; hash password with bcrypt (cost 12); if email matches an imported `students` record, link `students.user_id` to the new user; assign `STUDENT` role automatically; return `409 Conflict` if email already exists

## 3. Workshop Catalog Module [Person B — Week 1–2]

- [x] 3.1 Create `WorkshopModule` in NestJS with the Workshop entity
- [x] 3.2 Implement `POST /admin/workshops` (ORGANIZER/ADMIN): create workshop, validate required fields, set status=DRAFT
- [x] 3.3 Implement `PATCH /admin/workshops/:id` (ORGANIZER/ADMIN): update fields, emit WorkshopUpdated event when room or time changes
- [x] 3.4 Implement `POST /admin/workshops/:id/open` (ORGANIZER/ADMIN): transition DRAFT → OPEN
- [x] 3.5 Implement `POST /admin/workshops/:id/cancel` (ORGANIZER/ADMIN): transition → CANCELLED, emit WorkshopCancelled event
- [x] 3.6 Implement `GET /workshops` (public): paginated list of OPEN workshops; response fields: `id, title, speakerName, roomName, capacity, confirmedCount, heldCount, feeType, price, startsAt, endsAt, status, summaryStatus` — `ai_summary` is intentionally excluded from the list (available in detail endpoint only)
- [x] 3.7 Implement `GET /workshops/:id` (public): full workshop detail including room_map_url and ai_summary
- [x] 3.8 Implement `GET /admin/workshops/:id/stats` (ORGANIZER/ADMIN): return `{ total_registrations, confirmed_count, pending_payment_count, checkin_count, capacity, utilization_pct }`
- [x] 3.9 Implement SSE endpoint `GET /workshops/:id/seats` (backend): subscribe to Redis Pub/Sub channel `ws:{workshop_id}:seats`, push `{ remaining_seats, held_count, confirmed_count }` to connected clients; on client disconnect, unsubscribe from Redis channel
- [x] 3.10 Configure Student Web to consume the SSE endpoint: use the `EventSource` API to connect to `GET /workshops/:id/seats`, update seat count UI on each message, auto-reconnect on disconnect
- [x] 3.11 Build Admin Web UI: workshop list, create/edit form, open/cancel actions, statistics page
- [x] 3.12 Build Student Web UI: workshop list with realtime seat count badge, workshop detail page

## 4. Registration Module [Person C — Week 2–3]

- [x] 4.1 Create `RegistrationModule` in NestJS with the Registration entity
- [x] 4.2 Implement student validation: check `students.user_id = current_user.id` and `status = ACTIVE` before creating a registration
- [x] 4.3 Implement `POST /registrations` with PostgreSQL row lock (`SELECT ... FOR UPDATE` on the workshop row) inside a transaction
- [x] 4.4 Implement free workshop logic: create registration CONFIRMED immediately, increment confirmed_count, generate QR
- [x] 4.5 Implement paid workshop logic: create registration PENDING_PAYMENT, set hold_expires_at (+10 min), increment held_count
- [x] 4.6 Implement idempotency key: check `registrations.idempotency_key` before creating, return existing result if key matches
- [x] 4.7 Implement QR generation: HMAC-SHA256 sign with payload (registrationId, workshopId, studentId, expiresAt = end_time + 30 min), store the hash
- [x] 4.8 Implement `GET /me/registrations` (STUDENT): list the student's own registrations
- [x] 4.9 Implement `GET /me/registrations/:id/qr` (STUDENT): return QR image (base64 PNG) if status=CONFIRMED
- [x] 4.10 Implement BullMQ job `expire-hold`: enqueue as a **delayed job** targeting a specific `registrationId` (delay = 10 minutes from creation); on execution, check if the registration is still PENDING_PAYMENT — if yes, transition it to EXPIRED, decrement `workshops.held_count`, and emit `RegistrationExpired` event; if already CONFIRMED or CANCELLED, skip (idempotent)
- [x] 4.11 Write tests: 100 concurrent requests for the last seat, idempotency retry, hold expiration

## 5. Load Protection Module [Person A — Week 2–3]

- [ ] 5.1 Implement `TokenBucketRateLimiter` service using Redis (ioredis): atomic Lua script for check-and-consume
- [ ] 5.2 Create `RateLimitGuard` in NestJS: apply token bucket check per endpoint tier (ip, user_id, user_id+workshop_id)
- [ ] 5.3 Configure rate limits for all 4 tiers: public listing (60 burst / 10 refill/s), login (10/1s), registration (5 burst / 1 per 30s per user+workshop), admin (30/5s)
- [ ] 5.4 Implement 429 response with `Retry-After` header when limits are exceeded
- [ ] 5.5 Implement `POST /workshops/:id/queue-token` (STUDENT): issue a Redis key `queue:{userId}:{workshopId}` with 120-second TTL
- [ ] 5.6 Implement queue token validation in the registration flow: verify the token exists in Redis and delete it immediately on use (one-time-use)
- [ ] 5.7 Implement queue token issuance throttle: cap the number of tokens issued per second per workshop using a Redis counter
- [ ] 5.8 Write tests: rate limit enforcement returns 429, queue token is one-time-use, expired token is rejected

## 6. Payment Module [Person B — Week 3–4]

- [ ] 6.1 Create `PaymentModule` in NestJS with the `PaymentAdapter` interface (methods: createIntent, refund)
- [ ] 6.2 Implement `MockPaymentAdapter`: generate a UUID payment_intent_id, persist to DB, return a mock payment URL
- [ ] 6.3 Build a mock checkout page in Student Web: display payment details, "Pay" and "Cancel" buttons
- [ ] 6.4 Implement mock webhook trigger: after user confirms on the checkout page, the mock sends a signed HMAC-SHA256 webhook to `POST /payments/webhook`
- [ ] 6.5 Implement `POST /payments/webhook`: verify HMAC signature, process idempotently by payment_intent_id, update payment SUCCEEDED + registration CONFIRMED + generate QR
- [ ] 6.6 Implement auto-refund: when a SUCCEEDED webhook arrives but registration is EXPIRED → call `PaymentAdapter.refund()` with an idempotency key
- [ ] 6.7 Implement CircuitBreaker service using Redis: state key `cb:payment_gateway`, three states (Closed/Open/Half-Open), threshold: 5 consecutive failures OR >50% failure rate in 30s window (minimum 10 requests), gateway call timeout 5s, open duration 30s, 3 Half-Open probes
- [ ] 6.8 Wrap all PaymentAdapter calls in the circuit breaker; when Open → return 503 with user-facing message
- [ ] 6.9 Enforce `payments.idempotency_key` uniqueness: retry with the same key returns the existing intent
- [ ] 6.10 Implement BullMQ job `payment-reconcile`: runs every 15 minutes (cron); queries all PENDING_PAYMENT registrations where `hold_expires_at` is older than 30 minutes AND no corresponding payment with status SUCCEEDED exists; for each stale record → transition registration to NEEDS_REVIEW, log to audit, notify admin via in-app notification
- [ ] 6.11 Write tests: circuit breaker state transitions, duplicate webhook handling, auto-refund, idempotency
- [ ] 6.12 Handle FAILED payment webhook: when gateway sends webhook with status FAILED, update `payments.status = FAILED`, transition registration to `FAILED`, decrement `workshops.held_count`, emit `PaymentFailed` event for notification; return `200 OK` (idempotent — duplicate FAILED webhooks are no-ops)

## 7. Notification Module [Person C — Week 3–4]

- [ ] 7.1 Create `NotificationModule` in NestJS with the `NotificationChannel` interface (method: `send(event, recipient)`)
- [ ] 7.2 Implement `InAppNotificationChannel`: write to `notification_events` and `notification_deliveries`, update delivery status
- [ ] 7.3 Implement `EmailNotificationChannel` using the Resend SDK: send registration confirmation email with workshop details
- [ ] 7.4 Implement the outbox pattern: Notification module subscribes to all domain events per the event-to-channel mapping:
  - **Registration module**: `RegistrationConfirmed` (email + in-app), `RegistrationExpired` (in-app only)
  - **Payment module**: `PaymentSucceeded` (email + in-app, uses `registration_confirmed` template), `PaymentFailed` (in-app only)
  - **Workshop module**: `WorkshopUpdated` (email + in-app), `WorkshopCancelled` (email + in-app)
- [ ] 7.5 Implement workshop-change notifications: query all CONFIRMED + PENDING_PAYMENT registrations for the workshop, enqueue notifications for each student
- [ ] 7.6 Implement independent retry per channel: BullMQ jobs per channel with attempt_count and error_reason tracking
- [ ] 7.7 Implement `GET /me/notifications` (authenticated): list unread and read notifications
- [ ] 7.8 Implement `PATCH /me/notifications/:id/read` (authenticated): mark notification as read
- [ ] 7.9 Build Student Web UI: notification bell with unread badge count, notification dropdown list
- [ ] 7.10 Write tests: email failure does not roll back registration, per-channel retry, workshop cancellation triggers notifications to all registrants, `RegistrationExpired` sends in-app only, `PaymentFailed` sends in-app only, `PaymentSucceeded` sends email + in-app

## 8. Check-in PWA [Person C — Week 4–5]

- [ ] 8.1 Configure PWA manifest and service worker in `apps/checkin-pwa` using vite-plugin-pwa
- [ ] 8.2 Build the CHECKIN_STAFF login screen (reuse auth flow from shared package)
- [ ] 8.3 Build the workshop selection screen (lists workshops currently in progress or starting soon)
- [ ] 8.4 Implement `GET /checkin/preload/:workshopId` (CHECKIN_STAFF/ADMIN): return the roster (registrationId, studentId, qr_token_hash) and HMAC secret for the selected workshop
- [ ] 8.5 Implement saving the roster and HMAC secret to IndexedDB using the `idb` library
- [ ] 8.6 Build the QR scanner screen using the `html5-qrcode` library with camera access
- [ ] 8.7 Implement offline QR verification: decode QR payload, verify HMAC-SHA256 using the secret from IndexedDB, check expiresAt, look up registrationId in roster
- [ ] 8.8 Implement writing check-in events to IndexedDB: UUID event_id, scanned_at timestamp, status PENDING_SYNC or NEEDS_REVIEW
- [ ] 8.9 Implement background sync: detect network connectivity, send `POST /checkin/sync` with all pending events
- [ ] 8.10 Implement `POST /checkin/sync` (CHECKIN_STAFF): upsert check-in events by event_id, return ACCEPTED / DUPLICATE / REJECTED per event
- [ ] 8.11 Implement duplicate resolution on the server: accept the event with the earliest scanned_at, mark later events as DUPLICATE
- [ ] 8.12 Write tests: offline scan + sync flow, duplicate scan from two devices, expired QR rejection, NEEDS_REVIEW sync

## 9. Student Import Module [Person A — Week 4–5]

- [ ] 9.1 Create `StudentImportModule` in NestJS with a BullMQ queue named `student-import`
- [ ] 9.2 Implement the cron scheduler (`@Cron`, 2:00 AM nightly): list files in the Supabase Storage `student-imports` bucket, compute SHA-256 checksum, skip files already in `student_import_batches`
- [ ] 9.3 Implement the parse stage: read CSV from Storage, validate headers (required: `student_code, email, full_name, faculty`), parse each row into `student_import_rows`; per-row validation includes: required field presence, **email format** (RFC 5322 regex), **student code format** (non-empty alphanumeric), and within-batch duplicate `student_code` detection
- [ ] 9.4 Implement the validate stage: check required fields, detect duplicate student_codes within the batch, assign row_status = VALID / ERROR / DUPLICATE
- [ ] 9.5 Implement the threshold check: if error_rows / total_rows > error_threshold_pct (20%) → batch transitions to REJECTED, processing stops
- [ ] 9.6 Implement atomic promotion: a single transaction upserts valid rows into `students` (ON CONFLICT student_code DO UPDATE) and marks absent student_codes as INACTIVE
- [ ] 9.7 Implement batch report update: set total_rows, valid_rows, error_rows, status=PROMOTED/REJECTED, and completed_at on the batch record
- [ ] 9.8 Implement `GET /admin/imports/students` (ORGANIZER/ADMIN): paginated list of import batches
- [ ] 9.9 Implement `GET /admin/imports/students/:batchId` (ORGANIZER/ADMIN): full batch detail with error row list
- [ ] 9.10 Build Admin Web UI: import history page, batch report view, error row download
- [ ] 9.11 Write tests: malformed CSV rejects without changing students table, atomic rollback on worker crash, duplicate file is skipped by checksum

## 10. AI Summary Module [Person B — Week 5–6]

- [ ] 10.1 Create `AiSummaryModule` in NestJS with a BullMQ queue named `ai-summary`
- [ ] 10.2 Implement `POST /admin/workshops/:id/documents` (ORGANIZER/ADMIN): validate PDF MIME type and file size ≤ 20 MB, upload to Supabase Storage, create workshop_document record with upload_status=UPLOADED; **if an existing AI processing job is active, cancel it before publishing the new one**; publish `AI_SUMMARY_REQUESTED` job
- [ ] 10.3 Implement `GET /admin/workshops/:id/summary-status` (ORGANIZER/ADMIN): return current summary_status and ai_summary text
- [ ] 10.4 Implement Filter 1 — Extract text: use `pdf-parse` to extract raw text from the PDF in Storage
- [ ] 10.5 Implement Filter 2 — Clean text: strip repeated headers/footers, normalize whitespace, remove extraneous special characters
- [ ] 10.6 Implement Filter 3 — Chunk: split cleaned text into chunks ≤ 3,000 tokens using `tiktoken` or a character-based estimate
- [ ] 10.7 Implement Filter 4 — Call AI: send chunks to Gemini API (or OpenAI), collect the summary response, enforce a 30-second timeout
- [ ] 10.8 Implement Filter 5 — Validate output: ensure the summary is non-empty and within a reasonable length range
- [ ] 10.9 Implement save and auto-publish: write ai_summary to the `workshops` record and set summary_status=AI_GENERATED
- [ ] 10.10 Implement retry logic: BullMQ retries up to 3 times with exponential backoff; after exhaustion, set summary_status=SUMMARY_FAILED with error_reason
- [ ] 10.11 Build Admin Web UI: PDF upload button, summary_status indicator, summary display/edit form
- [ ] 10.12 Write tests: successful pipeline run, AI timeout triggers retry, file > 20 MB rejected, SUMMARY_FAILED does not affect workshop availability
- [ ] 10.13 Implement `PATCH /admin/workshops/:id/summary` (ORGANIZER/ADMIN): allow manual editing of `ai_summary` text; set `summary_status = ADMIN_EDITED`; only allowed when current status is `AI_GENERATED` or `ADMIN_EDITED`

## 11. Hardening & Integration Tests [All — Week 6–7]

- [ ] 11.1 Concurrency test: 100 simultaneous registrations for the last seat → exactly 1 CONFIRMED (Person A)
- [ ] 11.2 Rate limit test: burst requests on the registration endpoint → 429 with correct Retry-After timing (Person A)
- [ ] 11.3 Payment timeout test: hold expires, late webhook arrives → auto-refund executed (Person B)
- [ ] 11.4 Circuit breaker test: 5 failures → Open, 30s → Half-Open, 3 probes → Closed (Person B)
- [ ] 11.5 Offline check-in E2E: preload → offline scan → sync → verify no duplicates created (Person C)
- [ ] 11.6 Student import test: malformed CSV file → students table unchanged, atomic rollback on crash (Person A)
- [ ] 11.7 Notification test: workshop cancelled → all registrants receive both in-app and email notifications (Person C)
- [ ] 11.8 Review full API surface against requirements: confirm all acceptance criteria are covered by tests
- [ ] 11.9 Set up GitHub Actions CI: lint + unit tests on push, build validation for all apps
- [ ] 11.10 Write README with setup instructions, required environment variables, and commands to run each app
