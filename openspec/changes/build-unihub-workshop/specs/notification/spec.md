## ADDED Requirements

### Requirement: In-app notifications
The system SHALL display in-app notifications in the Student Web App. Students MUST be able to view unread notifications via a bell icon and mark individual notifications as read.

#### Scenario: View notification list
- **WHEN** a student calls `GET /me/notifications`
- **THEN** the backend returns a list of notification_events ordered by most recent, including read status

#### Scenario: Mark notification as read
- **WHEN** a student calls `PATCH /me/notifications/:id/read`
- **THEN** the notification is marked as read

### Requirement: Registration confirmation email
The system SHALL send a confirmation email when a registration transitions to CONFIRMED. The email MUST be sent via Resend and MUST include workshop details and a QR code image.

#### Scenario: Email after free workshop registration
- **WHEN** a free workshop registration transitions to CONFIRMED
- **THEN** the Notification worker sends a confirmation email with QR code within 1 minute

#### Scenario: Email provider failure does not roll back registration
- **WHEN** Resend returns an error during email delivery
- **THEN** the Notification worker retries the email channel independently; the registration is not rolled back, and the in-app notification is still delivered

### Requirement: Notifications when a workshop changes
The system SHALL notify all students with a CONFIRMED or PENDING_PAYMENT registration when a workshop is relocated, rescheduled, or cancelled.

#### Scenario: Room change notification
- **WHEN** an Organizer updates the `room_name` of a workshop
- **THEN** the system sends an in-app notification and an email to all registered students for that workshop, including the new room information

#### Scenario: Cancellation notification
- **WHEN** an Organizer cancels a workshop
- **THEN** the system sends an in-app notification and an email to all registered students informing them the workshop is cancelled

### Requirement: Channel adapter pattern for extensibility
The system SHALL implement the Notification module with a `NotificationChannel` interface (method: `send(event, recipient)`). Email and in-app are the two initial adapters. Adding a Telegram channel MUST only require implementing the interface and registering it in the Notification module — no changes to the Registration or Workshop modules.

#### Scenario: Adding a Telegram channel later
- **WHEN** a developer implements `TelegramNotificationChannel` and registers it in the Notification module
- **THEN** the Telegram channel operates in parallel with email and in-app without modifying the Registration or Workshop modules

### Requirement: Independent retry per notification channel
The system SHALL retry each notification channel independently. A failure in one channel MUST NOT affect delivery in other channels.

#### Scenario: Email failure does not affect in-app delivery
- **WHEN** the email channel exhausts retries and fails
- **THEN** the in-app channel still delivers successfully; the email delivery record is marked FAILED with an error_reason
