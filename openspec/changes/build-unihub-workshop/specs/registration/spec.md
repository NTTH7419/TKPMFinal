## ADDED Requirements

### Requirement: Oversell-safe registration using row lock
The system SHALL guarantee that no two students can receive the last available seat. The backend MUST acquire a PostgreSQL row lock (`SELECT ... FOR UPDATE`) on the workshop row within a transaction. The invariant `confirmed_count + held_count <= capacity` MUST always hold.

#### Scenario: 100 concurrent requests for the last seat
- **WHEN** 100 students simultaneously send registration requests when only 1 seat remains
- **THEN** exactly 1 request is accepted; the remaining 99 receive a WORKSHOP_FULL error

#### Scenario: Workshop is full
- **WHEN** a student attempts to register for a workshop where `confirmed_count + held_count = capacity`
- **THEN** the backend returns WORKSHOP_FULL without creating a registration record

### Requirement: Student identity verification before registration
The system SHALL reject registration attempts if the current user has no record in the `students` table with `status = ACTIVE`. The link is established via `students.user_id = current_user.id`.

#### Scenario: Student not yet imported
- **WHEN** a user with role STUDENT attempts to register but has no matching record in the `students` table
- **THEN** the backend returns STUDENT_NOT_VERIFIED and does not create a registration

#### Scenario: Active student registers successfully
- **WHEN** a user has a student record with `status = ACTIVE` and the workshop has available seats
- **THEN** the registration is created successfully

### Requirement: Idempotency key for registration
The system SHALL store an idempotency key (24-hour TTL) on each registration. A retry with the same key MUST return the previously created registration without creating a new one.

#### Scenario: Retry with the same idempotency key
- **WHEN** a client resends a registration request with the same `Idempotency-Key` header within 24 hours
- **THEN** the backend returns the previously created registration without creating a duplicate

### Requirement: Hold slot for paid workshops
The system SHALL create a `PENDING_PAYMENT` registration with a `hold_expires_at` for paid workshops. A background worker MUST expire the hold when the deadline passes and release the seat.

#### Scenario: Hold slot expires before payment
- **WHEN** `hold_expires_at` has passed and the registration is still PENDING_PAYMENT
- **THEN** the worker transitions the registration to EXPIRED, decrements `held_count`, and the seat becomes available

### Requirement: QR code generated after successful registration
The system SHALL generate a signed QR code (HMAC-SHA256) once a registration reaches CONFIRMED status. The QR payload MUST contain: registrationId, workshopId, studentId, expiresAt (= workshop end_time + 30 minutes).

#### Scenario: Free workshop receives QR immediately
- **WHEN** a student successfully registers for a free workshop
- **THEN** the registration transitions to CONFIRMED immediately and the QR code is returned in the response

#### Scenario: Paid workshop receives QR after payment confirmation
- **WHEN** a payment webhook succeeds and the registration transitions to CONFIRMED
- **THEN** a QR code is generated and accessible at `GET /me/registrations/:id/qr`

#### Scenario: Expired QR code
- **WHEN** staff scans a QR code after workshop end_time + 30 minutes
- **THEN** the PWA rejects the code with QR_EXPIRED
