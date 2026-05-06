# Delta for Check-in PWA

## ADDED Requirements

### Requirement: Offline-First PWA Preparation
The system MUST provide a PWA that preloads all necessary data while online so check-in staff can operate fully offline.

#### Scenario: Staff prepares PWA for offline check-in
- GIVEN an authenticated user with role `CHECKIN_STAFF`
- WHEN the staff opens the Check-in PWA via HTTPS
- THEN the Service Worker caches the app shell
- AND the PWA downloads the public key/metadata for QR signature verification
- AND the PWA downloads the local roster of valid registrations
- AND the PWA stores roster, staff metadata, device ID, and sync cursor in IndexedDB
- AND the PWA displays a "Ready for offline" status indicator

---

### Requirement: Offline QR Check-in
The system MUST allow check-in staff to scan and validate QR codes without network connectivity using locally cached data.

#### Scenario: Valid QR scanned offline
- GIVEN the PWA is in offline mode with a preloaded roster
- WHEN the staff scans a QR code using the device camera
- THEN the PWA decodes the QR and verifies the token signature
- AND the PWA validates `registration_id`, `workshop_id`, token expiry against the local roster
- AND the PWA generates a `checkin_event_id` (UUID)
- AND the PWA saves the check-in event with status `PENDING_SYNC` in IndexedDB

#### Scenario: Uncertain QR scanned offline
- GIVEN the PWA is in offline mode
- WHEN the staff scans a QR code that cannot be conclusively validated (e.g., roster outdated)
- THEN the PWA saves the event with status `NEEDS_REVIEW` in IndexedDB

#### Scenario: Invalid QR scanned
- GIVEN the PWA is in offline mode
- WHEN the staff scans a QR with an invalid signature or mismatched workshop
- THEN the PWA rejects the check-in immediately
- AND displays an error to the staff

---

### Requirement: Online Sync of Offline Events
The system MUST sync all locally stored check-in events to the backend when connectivity is restored, with idempotent processing.

#### Scenario: PWA comes back online
- GIVEN the PWA has pending check-in events in IndexedDB
- WHEN the PWA detects an online connection or the staff manually triggers sync
- THEN the PWA sends a batch of pending events to the Backend API
- AND the backend validates the staff's role and each event
- AND the backend upserts each event by `event_id` (idempotent)
- AND returns the result for each event
- AND the PWA updates the local event statuses accordingly

#### Scenario: Same QR scanned on two devices offline
- GIVEN two offline PWA devices scan the same QR code
- WHEN both devices sync to the backend
- THEN the backend accepts the first event
- AND marks the second event as a duplicate

#### Scenario: Sync interrupted mid-batch
- GIVEN a batch sync loses connectivity midway
- WHEN the PWA retries the batch
- THEN the backend processes idempotently — already-synced events are not duplicated

---

### Requirement: PWA Data Persistence
The system MUST persist check-in events across PWA restarts using IndexedDB.

#### Scenario: PWA closed and reopened while offline
- GIVEN the PWA is closed with pending events in IndexedDB
- WHEN the staff reopens the PWA
- THEN the pending events are still available in IndexedDB
- AND can be synced when online

#### Scenario: Browser clears storage
- GIVEN the browser clears all site storage
- WHEN the PWA is opened again
- THEN all local data is lost
- AND the staff must re-preload the roster while online

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Protocol | HTTPS only | Required for camera access and Service Worker |
| QR Library | ZXing (or equivalent) | Do not rely solely on native Barcode Detection API |
| Event ID | UUID per event | Ensures idempotent sync |
| Source of truth | Server (backend DB) | PWA is a local cache; server resolves conflicts |
| QR Token | Signed with expiry | Prevents forgery and replay |
| Storage | IndexedDB with persistent storage | Survives PWA restart; may be lost if browser clears data |
