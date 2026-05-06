## ADDED Requirements

### Requirement: Workshop CRUD for Organizers
The system SHALL allow ORGANIZER and ADMIN to create, update (title, speaker, room, room_map_url, capacity, fee_type, price, starts_at, ends_at), reschedule, relocate, and cancel workshops.

#### Scenario: Create a new workshop
- **WHEN** an ORGANIZER sends `POST /admin/workshops` with valid fields
- **THEN** the workshop is created with status=DRAFT and the workshop object is returned

#### Scenario: Relocate a published workshop
- **WHEN** an ORGANIZER sends `PATCH /admin/workshops/:id` with a new room_name
- **THEN** the workshop is updated and the system emits a WorkshopUpdated domain event

#### Scenario: Cancel a workshop
- **WHEN** an ORGANIZER sends `POST /admin/workshops/:id/cancel`
- **THEN** the workshop transitions to status=CANCELLED and the system emits a WorkshopCancelled domain event

### Requirement: Public workshop listing
The system SHALL allow any client (including unauthenticated users) to view the list of all PUBLISHED workshops, including speaker information, room name, and remaining seat count.

#### Scenario: Browse workshop list
- **WHEN** a client calls `GET /workshops`
- **THEN** the backend returns paginated PUBLISHED workshops with fields: title, speaker_name, room_name, starts_at, ends_at, capacity, confirmed_count, held_count, fee_type, price, summary_status, ai_summary

#### Scenario: View workshop detail with room map
- **WHEN** a client calls `GET /workshops/:id`
- **THEN** the backend returns full workshop details including room_map_url and ai_summary (when available)

### Requirement: Eventual-consistent seat count via Supabase Realtime
The system SHALL update the remaining seat count on the workshop listing with eventual consistency. The Student Web App subscribes to Supabase Realtime on the `workshops` table and receives updates when `confirmed_count` or `held_count` changes.

#### Scenario: Seat count updates after a registration
- **WHEN** a registration is CONFIRMED and `confirmed_count` changes in the database
- **THEN** Supabase Realtime broadcasts the change to all subscribed clients, and the UI updates within a few seconds

### Requirement: Statistics dashboard for Organizers
The system SHALL provide a statistics API for ORGANIZER and ADMIN: registration count, confirmed count, check-in count, and capacity utilization per workshop.

#### Scenario: View workshop statistics
- **WHEN** an ORGANIZER calls `GET /admin/workshops/:id/stats`
- **THEN** the backend returns: total_registrations, confirmed_count, pending_payment_count, checkin_count, capacity, utilization_pct
