## ADDED Requirements

### Requirement: Staff selects a specific workshop to preload
The Check-in PWA SHALL allow a CHECKIN_STAFF user to select one workshop to preload. The PWA calls `POST /checkin/preload` with the workshopId and receives the roster (registrationId, studentId, qr_token_hash list) and the HMAC secret, which are stored in IndexedDB.

#### Scenario: Successful preload while online
- **WHEN** staff selects a workshop and initiates preload
- **THEN** the PWA downloads the full roster of CONFIRMED registrations for that workshop into IndexedDB

#### Scenario: Preload complete, then network lost
- **WHEN** staff has successfully preloaded and then loses network connectivity
- **THEN** the PWA can still verify QR codes from IndexedDB without any network access

### Requirement: QR scanning and offline verification
The Check-in PWA SHALL scan QR codes using the device camera, verify the HMAC-SHA256 signature offline using the preloaded secret, and look up the registration in IndexedDB.

#### Scenario: Valid QR while offline
- **WHEN** staff scans a valid QR code (correct signature, registrationId in roster, not expired)
- **THEN** the PWA displays the student's information and records a PENDING_SYNC event in IndexedDB with a unique UUID event_id

#### Scenario: QR with invalid signature
- **WHEN** staff scans a QR code that fails HMAC verification
- **THEN** the PWA rejects it with QR_INVALID

#### Scenario: Expired QR code
- **WHEN** staff scans a QR code whose expiresAt has passed (after workshop end_time + 30 min)
- **THEN** the PWA rejects it with QR_EXPIRED

#### Scenario: QR not found in preloaded roster
- **WHEN** staff scans a valid QR code but the registrationId is not in the IndexedDB roster
- **THEN** the PWA stores a NEEDS_REVIEW event to allow server-side resolution after sync

### Requirement: Idempotent batch sync when connectivity is restored
The Check-in PWA SHALL send all PENDING_SYNC and NEEDS_REVIEW events to `POST /checkin/sync` when network connectivity is detected. The backend MUST upsert events by `event_id` to guarantee idempotency.

#### Scenario: Successful sync after offline period
- **WHEN** the PWA regains connectivity and has PENDING_SYNC events in IndexedDB
- **THEN** the PWA sends a batch of events; the backend upserts them; events transition to SYNCED in IndexedDB

#### Scenario: Resending already-synced events
- **WHEN** the PWA resends an event with an event_id the server has already accepted
- **THEN** the server returns 200 OK without creating a duplicate check-in; the event remains SYNCED

### Requirement: Duplicate scan resolution across devices
The system SHALL accept the first check-in event for a given registrationId and mark subsequent events as DUPLICATE.

#### Scenario: Two devices scan the same QR while offline
- **WHEN** two staff members on different devices scan the same QR code while offline and both later sync to the server
- **THEN** the server accepts the event with the earlier scanned_at timestamp; the later event is marked DUPLICATE
