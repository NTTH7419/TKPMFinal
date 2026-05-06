## Context

UniHub Workshop is a greenfield system that digitizes the "Skills and Career Week" event at University A. The system serves ~12,000 students and three user groups (Student, Organizer, Check-in Staff + Admin), with real technical challenges: seat contention, traffic spikes, unstable payment gateway, offline check-in, and one-way CSV integration with the legacy student system.

Team size: 3 developers. Greenfield. Academic project timeline. Prioritize correctness of patterns over production-grade infrastructure.

## Goals / Non-Goals

**Goals:**
- Implement all 9 capabilities in priority order: auth-rbac → workshop-catalog → registration → load-protection → payment → notification → checkin-pwa → student-import → ai-summary.
- Clearly demonstrate key technical patterns: row lock, token bucket, circuit breaker, idempotency, pipe-and-filter, batch sequential, channel adapter, offline-first.
- Monorepo (pnpm): 1 NestJS API + 3 React/Vite apps + 1 shared types package.
- Use Supabase (PostgreSQL + Storage + Realtime) and Upstash Redis (cache / queue / rate-limit).

**Non-Goals:**
- Real payment gateway (Stripe / VNPay / MoMo) — using mock adapter.
- Native mobile app — Check-in uses PWA.
- SSO with the university's identity system — self-managed email/password auth.
- Kubernetes / autoscaling / full observability dashboard.
- Admin-configurable notification rule engine.
- Scoped check-in permissions per room — simple RBAC is sufficient.

## Decisions

### D1: pnpm Monorepo Workspaces
**Decision:** Single repository, pnpm workspaces, 5 packages: `apps/api`, `apps/student-web`, `apps/admin-web`, `apps/checkin-pwa`, `packages/shared`.
**Rationale:** Small team; sharing types between FE and BE is straightforward without publishing packages. `packages/shared` holds DTOs, enums, and constants.
**Alternative considered:** Separate repos — excessive management overhead for 3 developers.

### D2: NestJS Modular Monolith
**Decision:** NestJS backend; each capability maps to one NestJS module. Workers run in-process via BullMQ.
**Rationale:** Clear module boundaries, decorator-based guards for clean RBAC enforcement, BullMQ integrates naturally. Team is familiar with TypeScript.
**Alternative considered:** Express/Fastify — less structure, harder to enforce module boundaries.

### D3: Supabase Realtime Replaces Redis Pub/Sub for Seat Updates
**Decision:** Use Supabase Realtime (Postgres Changes) to broadcast seat count updates from DB directly to Student Web clients. No Redis pub/sub or custom SSE endpoint needed for this feature.
**Rationale:** Seat count on the listing page only requires eventual consistency. Supabase Realtime is significantly simpler — the frontend subscribes directly, no custom WebSocket server required.
**Limitation:** Supabase Realtime free tier has a concurrent connection cap. Acceptable for an academic project.

### D4: Upstash Redis for Rate Limiting, Queue Tokens, Circuit Breaker, JWT Blocklist
**Decision:** Use Upstash Redis (managed, HTTP-based SDK). BullMQ connects to the same Redis instance.
**Rationale:** No self-managed Redis needed. Upstash free tier is sufficient for this project. BullMQ requires native Redis (ioredis) — Upstash provides a Redis-compatible URL.
**Note:** Token bucket stores `(tokens, last_refill_ts)` per Redis key. Circuit breaker stores state key with TTL.

### D5: Mock Payment Gateway
**Decision:** Implement `MockPaymentAdapter` in the Payment module. A mock checkout endpoint `POST /mock-payment/pay/:intentId` simulates payment success/failure. Webhook is sent to the same API.
**Rationale:** No real payment gateway available. The pattern is fully preserved: adapter interface, circuit breaker, idempotency key, HMAC webhook signature verification (fixed secret).
**Auto-refund:** When hold expires and a webhook arrives late with SUCCEEDED status → refund worker calls `MockPaymentAdapter.refund()` with an idempotency key.

### D6: JWT Stateless + Redis Blocklist
**Decision:** Access token: JWT, 15-min TTL, stored in memory. Refresh token: JWT, 7-day TTL, stored in HTTP-only cookie. Rotated on every refresh; old token revoked by storing `jti` in Redis with TTL = remaining lifetime.
**Rationale:** Stateless tokens scale across multiple API instances. Refresh token rotation mitigates token theft. Blocklist only holds revoked `jti` values, keeping it small.

### D7: Signed QR Token — HMAC-SHA256, TTL = end_time + 30 min
**Decision:** QR payload: `registrationId + workshopId + studentId + expiresAt`. Signed with HMAC-SHA256 using a server secret. Check-in PWA verifies the signature offline using the preloaded secret.
**Rationale:** A signed QR cannot be forged offline. TTL = workshop end_time + 30 minutes provides a buffer for staff to process the last attendees.

### D8: Student Validation on Registration
**Decision:** Before creating a registration, the Registration module checks that `students.user_id = current_user.id` and `students.status = ACTIVE`. If no record exists → return `STUDENT_NOT_VERIFIED` error.
**Rationale:** Requirements explicitly state "verify students at registration time" — only students imported via CSV are allowed to register.
**Implication:** Students must be imported before they can register. Flow: CSV import → student record created → user creates account with matching email → `students.user_id` is linked.

### D9: Workshop Change Notifications
**Decision:** When an Organizer calls `PATCH /admin/workshops/:id` (room or time change) or `POST /admin/workshops/:id/cancel`, the Workshop module emits a `WorkshopUpdated` or `WorkshopCancelled` domain event. The Notification module consumes the event and notifies all students with a `CONFIRMED` or `PENDING_PAYMENT` registration for that workshop.
**Rationale:** Requirements mention room changes, time changes, and cancellations. Students who have already registered need to be informed to adjust their schedules.

### D10: Check-in PWA — Staff Selects Workshop to Preload
**Decision:** The first screen of the Check-in PWA lists workshops currently in progress or about to start. Staff selects one workshop → PWA preloads its roster (registrationId, studentId, qr_token_hash) and the HMAC secret into IndexedDB.
**Rationale:** Preloading only the selected workshop reduces data transfer and keeps the PWA focused on the workshop being staffed.

## Risks / Trade-offs

- **Supabase Realtime limits** → Free tier caps at 200 concurrent connections. If needed, upgrade the plan or reduce subscription granularity.
- **BullMQ + Upstash Redis** → BullMQ requires `ioredis`; Upstash provides a Redis-compatible endpoint. Needs thorough connection testing. Fallback: `pg-boss` (PostgreSQL-backed queue) if connection issues arise.
- **Student–User linking** → Email must match between the CSV and the registered account. If a student uses a different email, the link will fail. The UI must surface a clear error message.
- **Mock payment** → Circuit breaker pattern is fully demonstrated, but mock latency won't reflect real gateway behavior. Artificial delay can be injected in the mock adapter to simulate this.
- **PWA offline storage** → IndexedDB has good support on Chrome/Edge but limited persistence on Safari iOS. Installing the PWA is required for reliable persistent storage.
- **AI API cost** → OpenAI/Gemini charges per token. The 20 MB file limit and 3,000-token chunk cap keep costs bounded for an academic project.
