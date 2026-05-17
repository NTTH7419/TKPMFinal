## ADDED Requirements

### Requirement: Offline status is clearly displayed in checkin-pwa
ScanPage SHALL display a persistent indicator showing online/offline status and the number of pending (unsynced) check-in events.

#### Scenario: Online with no pending events
- **WHEN** device is online and all check-ins are synced
- **THEN** indicator shows green "Online" status with no pending count

#### Scenario: Offline with pending events
- **WHEN** device is offline and has 3 pending check-in events
- **THEN** indicator shows red "Offline" status with "3 pending" count

#### Scenario: Back online with pending events
- **WHEN** device comes back online with pending events
- **THEN** indicator shows syncing state and updates to 0 pending after sync completes

### Requirement: QR scan result provides clear visual and haptic feedback
ScanPage SHALL provide immediate visual feedback (color change + icon) and haptic feedback (vibration) on scan success or failure.

#### Scenario: Successful scan
- **WHEN** a valid registered QR code is scanned
- **THEN** screen flashes green, shows checkmark icon with attendee name, and device vibrates once (if Vibration API available)

#### Scenario: Failed scan (invalid or already checked in)
- **WHEN** an invalid or already-used QR code is scanned
- **THEN** screen flashes red, shows error icon with reason message, and device vibrates twice

#### Scenario: Feedback auto-resets
- **WHEN** scan feedback (success or failure) has been shown for 2 seconds
- **THEN** scanner returns to idle scanning state automatically

### Requirement: WorkshopSelectPage shows check-in progress
WorkshopSelectPage SHALL display checked-in count vs total expected attendees for each workshop.

#### Scenario: Progress display
- **WHEN** user views WorkshopSelectPage
- **THEN** each workshop shows "X / Y checked in" where X is synced check-ins and Y is total roster size

#### Scenario: Progress updates after check-in
- **WHEN** user returns to WorkshopSelectPage after scanning
- **THEN** the check-in count for the active workshop is updated to reflect new check-ins
