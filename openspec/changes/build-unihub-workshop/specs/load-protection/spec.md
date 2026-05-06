# Delta for Realtime Seat Count & Load Protection

## ADDED Requirements

### Requirement: Realtime Seat Count via SSE
The system MUST push seat availability updates to connected clients in real-time using Server-Sent Events (SSE), with Redis Pub/Sub for cross-instance distribution.

#### Scenario: Seat count changes after a registration
- GIVEN one or more students are connected via SSE to the workshop detail page
- WHEN a registration, hold, or expiration changes the seat count
- THEN the backend emits an internal event
- AND Redis Pub/Sub distributes the event to all API instances
- AND each instance pushes the updated `remaining_seats` to connected clients
- AND clients update the UI in real-time

#### Scenario: SSE connection lost
- GIVEN a client's SSE connection drops
- WHEN the client reconnects
- THEN the client fetches the latest seat count snapshot
- AND resumes listening for live updates

#### Scenario: Redis Pub/Sub fails
- GIVEN Redis Pub/Sub is temporarily unavailable
- WHEN a registration changes the seat count
- THEN the registration is still processed correctly via the database
- AND realtime updates are degraded (clients won't receive live pushes)
- AND the system recovers automatically when Redis is restored

---

### Requirement: Virtual Queue for Peak Traffic
The system MUST implement a virtual queue to prevent all 12,000 students from hitting the registration API simultaneously during peak registration windows.

#### Scenario: Student enters registration during peak time
- GIVEN a student navigates to the registration screen during a high-traffic period
- WHEN the frontend requests a queue token from the backend
- THEN Redis stores a token with `{user_id, workshop_id, issued_at, expires_at}` (TTL = 120 seconds)
- AND the backend only accepts registration requests with a valid queue token

#### Scenario: Queue token used successfully
- GIVEN a student has a valid queue token
- WHEN the student submits a registration request with the token
- THEN the backend validates the token (correct user, correct workshop, not expired)
- AND processes the registration
- AND deletes the token from Redis immediately after use

#### Scenario: Queue token expired
- GIVEN a student's queue token has passed its 120-second TTL
- WHEN the student attempts to register with the expired token
- THEN the backend rejects the request
- AND the student must request a new token (re-entering the queue)

#### Scenario: Queue token misused
- GIVEN a queue token bound to `user_id=A` and `workshop_id=X`
- WHEN a different user or different workshop ID is submitted with that token
- THEN the backend rejects the request

---

### Requirement: Token Bucket Rate Limiting
The system MUST enforce rate limits using a Token Bucket algorithm backed by Redis, with tier-specific configurations per endpoint type.

#### Scenario: Public endpoint rate limit (view schedule)
- GIVEN a client browsing workshop listings
- WHEN the client exceeds 60 requests burst at 10/s refill rate
- THEN the backend returns `429 Too Many Requests` with `Retry-After: 5s`

#### Scenario: Login endpoint rate limit
- GIVEN a client attempting to log in
- WHEN the client exceeds 10 requests burst at 1/s refill rate
- THEN the backend returns `429 Too Many Requests` with `Retry-After: 10s`

#### Scenario: Registration endpoint rate limit
- GIVEN a student attempting to register for a workshop
- WHEN the student exceeds 5 requests burst at 1/30s refill rate (keyed by `user_id+workshop_id`)
- THEN the backend returns `429 Too Many Requests` with `Retry-After: 30s`

#### Scenario: Admin endpoint rate limit
- GIVEN an admin performing operations
- WHEN the admin exceeds 30 requests burst at 5/s refill rate (keyed by `user_id`)
- THEN the backend returns `429 Too Many Requests` with `Retry-After: 5s`

---

### Requirement: Idempotent Registration Retry
The system MUST handle client retries due to timeouts without creating duplicate registrations.

#### Scenario: Client retries after timeout
- GIVEN a client submitted a registration request that timed out
- WHEN the client retries with the same `Idempotency-Key`
- THEN the backend returns the previously created registration result
- AND does NOT create a new registration

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Realtime transport | SSE (Server-Sent Events) | One-directional push; simpler than WebSocket for seat updates |
| Realtime source of truth | Database (NOT SSE) | Registration API always checks DB in a transaction |
| Cross-instance distribution | Redis Pub/Sub | Ensures all API instances broadcast updates |
| Queue token TTL | 120 seconds | Time window for student to complete registration |
| Queue token binding | `user_id + workshop_id` | Prevents token sharing or misuse |
| Rate limit algorithm | Token Bucket (Redis) | Allows burst with sustained rate control |
| Rate limit enforcement | Backend middleware only | Frontend cannot be trusted |
| Seat update semantics | Idempotent, snapshot-based | Handles out-of-order delivery by using latest snapshot |

### Rate Limit Tiers

| Endpoint Tier | Key | Burst (Capacity) | Refill Rate | Retry-After |
| --- | --- | --- | --- | --- |
| Public (view schedule) | `ip` | 60 | 10/s | 5s |
| Login | `ip` | 10 | 1/s | 10s |
| Registration | `user_id+workshop_id` | 5 | 1/30s | 30s |
| Admin operations | `user_id` | 30 | 5/s | 5s |
