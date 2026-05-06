# Delta for Registration

## ADDED Requirements

### Requirement: Workshop Registration with Oversell Protection
The system MUST allow students to register for workshops while preventing overselling through database-level row locking and transactional seat counting.

#### Scenario: Student registers for a free workshop
- GIVEN an authenticated student with role `STUDENT`
- WHEN the student submits a registration request with a valid queue token and `Idempotency-Key`
- THEN the backend verifies authentication, role, rate limit, and queue token
- AND opens a database transaction
- AND acquires a row lock on the workshop record
- AND verifies the workshop is published, registration is still open, and seats are available (`confirmed_count + held_count < capacity`)
- AND creates a registration with status `CONFIRMED`
- AND increments `confirmed_count`
- AND commits the transaction
- AND emits a seat update event and a notification event

#### Scenario: Student registers for a paid workshop
- GIVEN an authenticated student with role `STUDENT`
- WHEN the student submits a registration request for a paid workshop
- THEN the same validation and locking flow applies
- AND a registration is created with status `PENDING_PAYMENT` and `hold_expires_at` set
- AND `held_count` is incremented
- AND the transaction commits
- AND the payment flow is initiated separately

#### Scenario: Workshop is full
- GIVEN a workshop where `confirmed_count + held_count >= capacity`
- WHEN a student attempts to register
- THEN the backend returns `WORKSHOP_FULL`
- AND no registration is created

#### Scenario: Workshop is cancelled
- GIVEN a workshop with status `CANCELLED`
- WHEN a student attempts to register
- THEN the backend returns `WORKSHOP_CANCELLED`

---

### Requirement: Idempotent Registration Requests
The system MUST support idempotent registration via an `Idempotency-Key` header, retained for 24 hours.

#### Scenario: Student retries with the same idempotency key
- GIVEN a registration was already created with a specific `Idempotency-Key`
- WHEN the student sends another request with the same key within 24 hours
- THEN the backend returns the previously created registration
- AND does NOT create a new registration or modify seat counts

---

### Requirement: Queue Token Validation
The system MUST validate queue tokens before processing registration requests.

#### Scenario: Queue token expired
- GIVEN a student submits a registration request with an expired queue token
- WHEN the backend validates the token
- THEN the backend returns `QUEUE_TOKEN_EXPIRED`
- AND no registration is created

---

### Requirement: Hold Slot Expiration
The system MUST automatically expire held slots for paid workshops that are not paid within the hold window.

#### Scenario: Hold expires without payment
- GIVEN a registration with status `PENDING_PAYMENT` that has passed `hold_expires_at`
- WHEN the hold-expire-worker runs
- THEN the registration is transitioned to `EXPIRED`
- AND `held_count` is decremented
- AND the seat becomes available for other students

---

### Requirement: One Active Registration Per Student Per Workshop
The system MUST enforce that each student can have at most one active registration per workshop.

#### Scenario: Student tries to register for the same workshop again
- GIVEN a student already has an active registration (CONFIRMED or PENDING_PAYMENT) for a workshop
- WHEN the student submits another registration request for the same workshop
- THEN the backend rejects the request

---

### Requirement: Transaction Safety
The system MUST NOT perform heavy I/O operations (email, payment gateway calls, QR generation) inside the database transaction that holds the row lock.

#### Scenario: Lock-holding transaction stays minimal
- GIVEN a registration transaction is in progress
- WHEN the row lock is held on the workshop record
- THEN only seat validation and registration insert are performed within the transaction
- AND email, payment gateway, and QR generation happen AFTER the transaction commits

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Row locking | `SELECT FOR UPDATE` on workshop row | Prevents concurrent oversell |
| Seat invariant | `confirmed_count + held_count ≤ capacity` | Hard constraint enforced in transaction |
| Realtime seat display | NOT source of truth | DB transaction is the final arbiter |
| Idempotency key retention | 24 hours | Same key within window returns cached result |
| One registration per student per workshop | Enforced via unique constraint or check | Prevents duplicates |
| Transaction scope | Minimal — no external I/O inside lock | Keeps lock duration short |
| Hold expiration | Via hold-expire-worker (BullMQ) | Automatic slot reclamation |
