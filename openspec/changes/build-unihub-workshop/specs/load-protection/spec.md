## ADDED Requirements

### Requirement: Token bucket rate limiting per endpoint tier
The system SHALL implement token bucket rate limiting using Redis. Each request consumes one token; tokens refill at a fixed rate. Requests that exceed the burst capacity MUST receive a `429 Too Many Requests` response with a `Retry-After` header.

Rate limit tiers:
- Public listing: key=`ip`, burst=60, refill=10/s
- Login: key=`ip`, burst=10, refill=1/s
- Workshop registration: key=`user_id:workshop_id`, burst=5, refill=1/30s
- Admin operations: key=`user_id`, burst=30, refill=5/s

#### Scenario: Request exceeds rate limit
- **WHEN** a client sends requests that exhaust the burst capacity for an endpoint tier
- **THEN** the backend returns `429 Too Many Requests` with a `Retry-After: <seconds>` header

#### Scenario: Request within allowed limits
- **WHEN** a client sends a request within the burst capacity
- **THEN** the request is processed normally and one token is consumed

### Requirement: Virtual queue token for workshop registration
The system SHALL issue single-use virtual queue tokens (bound to user_id + workshop_id, TTL 120 s) stored in Redis before a student can submit a registration request. A token that is expired or has already been used MUST be rejected.

#### Scenario: Successfully obtain a queue token
- **WHEN** a student calls `POST /workshops/:id/queue-token`
- **THEN** the system issues a token with a 120-second TTL stored in Redis

#### Scenario: Registration submitted without a queue token
- **WHEN** a student sends `POST /registrations` without a queue token
- **THEN** the backend returns QUEUE_TOKEN_REQUIRED

#### Scenario: Queue token has expired
- **WHEN** a student sends a registration request with a queue token that has exceeded its 120-second TTL
- **THEN** the backend returns QUEUE_TOKEN_EXPIRED and the token is deleted from Redis

#### Scenario: Queue token already used (one-time-use)
- **WHEN** a student sends a second registration request reusing an already-consumed token
- **THEN** the backend returns QUEUE_TOKEN_EXPIRED because the token was deleted from Redis on first use

### Requirement: Fair token issuance under peak load
The system SHALL throttle queue token issuance to a controlled rate per workshop so that only a bounded number of registration requests reach the API per second, ensuring fairness among competing students.

#### Scenario: 12,000 students arrive in the first 10 minutes
- **WHEN** 12,000 students simultaneously request a queue token for the same workshop
- **THEN** the system issues tokens at a controlled rate; students receive tokens in order without any individual being unfairly prioritized
