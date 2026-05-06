# Delta for Notification

## ADDED Requirements

### Requirement: Event-Driven Notification with Channel Adapters
The system MUST send notifications through a channel adapter pattern, decoupling business modules from notification delivery. Adding a new channel (e.g., Telegram) MUST NOT require changes to business logic modules.

#### Scenario: Registration confirmed triggers notification
- GIVEN a domain event `RegistrationConfirmed` (free workshop) or `PaymentSucceeded` (paid workshop) is emitted
- WHEN the event is processed by the notification system
- THEN the backend writes the event to `notification_events` (outbox pattern)
- AND the notification worker reads the event and maps it to template `registration_confirmed`
- AND creates `notification_deliveries` records for each target channel (email and in-app)
- AND each channel adapter delivers the notification independently

#### Scenario: Registration expired triggers notification
- GIVEN a domain event `RegistrationExpired` is emitted by the Hold Expire Worker
- WHEN the notification worker processes the event
- THEN an in-app notification is created using template `registration_expired`

#### Scenario: Workshop cancelled triggers notification
- GIVEN a domain event `WorkshopCancelled` is emitted by an Organizer
- WHEN the notification worker processes the event
- THEN notifications are sent via email and in-app using template `workshop_cancelled`

#### Scenario: Workshop updated (room/time change) triggers notification
- GIVEN a domain event `WorkshopUpdated` is emitted by an Organizer
- WHEN the notification worker processes the event
- THEN notifications are sent via email and in-app using template `workshop_updated`

#### Scenario: Payment failed triggers notification
- GIVEN a domain event `PaymentFailed` is emitted by the Payment Module
- WHEN the notification worker processes the event
- THEN an in-app notification is created using template `payment_failed`

---

### Requirement: Event-to-Template-to-Channel Mapping
The system MUST maintain a clear mapping from domain events to notification templates and delivery channels.

#### Scenario: Mapping table
- GIVEN the following mapping is configured:

| Domain Event | Template | Channels |
| --- | --- | --- |
| `RegistrationConfirmed` (free) | `registration_confirmed` | email, in-app |
| `PaymentSucceeded` | `registration_confirmed` | email, in-app |
| `RegistrationExpired` | `registration_expired` | in-app |
| `WorkshopCancelled` | `workshop_cancelled` | email, in-app |
| `WorkshopUpdated` | `workshop_updated` | email, in-app |
| `PaymentFailed` | `payment_failed` | in-app |

- WHEN a new channel (e.g., Telegram) is added
- THEN a new `TelegramAdapter` implementing `NotificationChannelAdapter` interface is created
- AND the channel column is updated in the mapping
- AND NO business module code is modified

---

### Requirement: Retry Policy with Per-Channel Independence
The system MUST retry failed notification deliveries with exponential backoff, independently per channel.

#### Scenario: Email delivery fails and retries
- GIVEN a notification delivery for the email channel fails
- WHEN the worker applies the retry policy
- THEN it retries with the following backoff schedule:
  - Attempt 1: immediately
  - Attempt 2: after 1 minute
  - Attempt 3: after 5 minutes
  - Attempt 4: after 30 minutes
  - Attempt 5 (final): after 2 hours
- AND if all 5 attempts fail, the delivery status is set to `FAILED_PERMANENT`
- AND the in-app delivery for the same event is NOT affected

#### Scenario: Template missing a variable
- GIVEN a notification template references a variable not present in the event payload
- WHEN the worker attempts to render the template
- THEN the delivery is marked `FAILED` with an error reason
- AND no retry is attempted

---

### Requirement: Idempotent Notification Processing
The system MUST prevent duplicate deliveries for the same event and channel combination.

#### Scenario: Event processed twice
- GIVEN a domain event is delivered to the notification worker more than once
- WHEN the worker attempts to create `notification_deliveries`
- THEN the unique constraint on `(event_id, channel)` prevents duplicate records
- AND the worker handles the constraint violation gracefully

---

### Requirement: Notification Isolation from Business Logic
The system MUST ensure that notification failures do not affect the success of business transactions.

#### Scenario: Email fails but registration succeeds
- GIVEN a registration is confirmed successfully
- WHEN the notification email delivery fails
- THEN the registration remains confirmed
- AND the delivery is retried independently

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Outbox pattern | `notification_events` table | Ensures events are not lost even if worker is down |
| Delivery uniqueness | `UNIQUE(event_id, channel)` | Prevents duplicate sends per channel |
| Max retry attempts | 5 | After 5 failures → `FAILED_PERMANENT` |
| Channel adapter interface | `NotificationChannelAdapter` | Enables adding channels without modifying business logic |
| Delivery status tracking | Stored in `notification_deliveries` | Required for audit and monitoring |
| Business isolation | Notification failure ≠ business rollback | Registration/payment must not be affected |
