## Why

University A holds an annual "Skills and Career Week" event spanning 5 days, with 8–12 workshops running in parallel each day. The current process using Google Forms and manual email notifications cannot scale to the ~12,000 students who need to participate. The entire workflow must be digitized end-to-end — from registration to on-site check-in — with fairness, consistency, and fault tolerance as core requirements.

## What Changes

- **Build new** Student Web App (React + Vite) for students to browse workshops, register, pay, and view QR codes.
- **Build new** Admin Web App (React + Vite) for organizers to manage workshops, upload PDFs, view statistics, and manage student CSV imports.
- **Build new** Check-in PWA (React + Vite + PWA) — offline-first — for staff to scan QR codes even without network connectivity.
- **Build new** Backend API (NestJS, Modular Monolith) with 9 independent business modules.
- **Build new** Background Workers (BullMQ) for notifications, payment reconciliation, CSV import, and AI summary generation.
- **Integrate** Supabase (PostgreSQL + Realtime + Storage), Upstash Redis (rate limiting, queue tokens, circuit breaker state), Resend (email), Gemini/OpenAI API (AI summary), Mock Payment Gateway.
- Monorepo using pnpm workspaces: `apps/api`, `apps/student-web`, `apps/admin-web`, `apps/checkin-pwa`, `packages/shared`.

## Capabilities

### New Capabilities

- `auth-rbac`: Email/password login, JWT access token (15 min) + refresh token rotation (7 days), Redis blocklist for revoked tokens, RBAC with 4 roles (STUDENT, ORGANIZER, CHECKIN_STAFF, ADMIN), audit log for critical actions.
- `workshop-catalog`: Workshop CRUD (title, speaker, room, room_map_url, capacity, fee_type, price, schedule), public listing with eventual-consistent seat count via Supabase Realtime, workshop detail page showing AI summary, statistics dashboard for organizers (registrations, confirmed count, capacity utilization per workshop).
- `registration`: Workshop registration (free and paid) using PostgreSQL row lock + hold slot, student identity verification against the `students` table (CSV-imported), 24-hour idempotency key, signed QR code generation (HMAC-SHA256, TTL = workshop end_time + 30 min), hold expiration worker.
- `payment`: Mock payment gateway adapter, payment intent + webhook flow, 30-day idempotency key, circuit breaker (Closed/Open/Half-Open) with graceful degradation, auto-refund when hold expires after payment succeeds, payment reconciliation worker.
- `notification`: In-app notification (bell + list in Student Web), registration confirmation email, notifications when a workshop is rescheduled/relocated/cancelled sent to all registered students, channel adapter pattern for easy addition of new channels (e.g. Telegram), independent retry per channel.
- `checkin-pwa`: Offline-first PWA, staff selects a specific workshop to preload its roster + HMAC secret into IndexedDB, camera QR scanning, offline signature verification, PENDING_SYNC event storage, idempotent batch sync when connectivity is restored, duplicate scan handling.
- `student-import`: Nightly scheduler detects new CSV via checksum, batch sequential pipeline: parse → staging table → validate → atomic promotion into `students`, batch report for admins, handles malformed files and duplicate records without disrupting the running system.
- `ai-summary`: PDF upload (max 20 MB), pipe-and-filter pipeline (extract text → clean → chunk ≤ 3,000 tokens → call AI → validate → save), auto-publish with summary_status=AI_GENERATED, max 3 retries, SUMMARY_FAILED on exhaustion without affecting workshop availability.
- `load-protection`: Token bucket rate limiting per endpoint tier (Redis), virtual queue token (TTL 120 s, one-time-use) gating the registration API, 429 + Retry-After response when limits are exceeded.

### Modified Capabilities

- (None — this is a greenfield system)

## Impact

- **New tech stack**: pnpm monorepo, NestJS, React + Vite, Supabase, Upstash Redis, BullMQ, Resend, Gemini API.
- **External services required**: Supabase project (PostgreSQL + Realtime + Storage), Upstash Redis instance, Resend API key, AI provider API key (Gemini or OpenAI).
- **PostgreSQL schema**: 13 core tables — users, roles, user_roles, students, workshops, registrations, payments, checkin_events, workshop_documents, student_import_batches, student_import_rows, notification_events, notification_deliveries.
- **3 frontend apps** deployed independently (student, admin, checkin-pwa).
- **No existing system to migrate** — greenfield.
