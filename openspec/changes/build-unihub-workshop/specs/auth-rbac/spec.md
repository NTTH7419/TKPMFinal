## ADDED Requirements

### Requirement: Email and password authentication
The system SHALL allow users to log in using their email and password. The backend MUST verify the bcrypt hash (cost factor ≥ 12) and check that `users.status = ACTIVE` before issuing tokens.

#### Scenario: Successful login
- **WHEN** a user sends `POST /auth/login` with valid email/password and an ACTIVE account
- **THEN** the backend returns a JWT access token (TTL 15 min) and sets a refresh token (TTL 7 days) in an HTTP-only cookie

#### Scenario: Invalid credentials
- **WHEN** a user sends an incorrect email or password
- **THEN** the backend returns `401 Unauthorized`

#### Scenario: Locked account
- **WHEN** a user attempts to log in with an account where `status = LOCKED`
- **THEN** the backend returns `403 Forbidden`

### Requirement: JWT access token and refresh token rotation
The system SHALL use stateless access tokens (15-min TTL) and rotating refresh tokens (7-day TTL). On every refresh, a new token pair is issued and the old refresh token is revoked via a Redis blocklist keyed by `jti`.

#### Scenario: Successful token refresh
- **WHEN** a client sends `POST /auth/refresh` with a valid, non-revoked refresh token
- **THEN** the backend issues a new access token (15 min) and a new refresh token (7 days), and revokes the old refresh token

#### Scenario: Revoked refresh token reuse
- **WHEN** a client sends a refresh token whose `jti` is present in the Redis blocklist
- **THEN** the backend returns `401` and requires the user to log in again

#### Scenario: Expired refresh token
- **WHEN** a client sends a refresh token older than 7 days
- **THEN** the backend returns `401` and requires the user to log in again

### Requirement: RBAC with 4 roles enforced at the backend
The system SHALL enforce access control at the backend for 4 roles: STUDENT, ORGANIZER, CHECKIN_STAFF, ADMIN. Frontend UI only shows/hides elements — it is not a security boundary.

#### Scenario: Student accesses admin API
- **WHEN** a user with role STUDENT calls `POST /admin/workshops`
- **THEN** the backend returns `403 Forbidden`

#### Scenario: Check-in staff accesses workshop management API
- **WHEN** a user with role CHECKIN_STAFF calls `PATCH /admin/workshops/:id`
- **THEN** the backend returns `403 Forbidden`

#### Scenario: ADMIN has full ORGANIZER access
- **WHEN** a user with role ADMIN calls any endpoint requiring ORGANIZER
- **THEN** the backend allows the request

### Requirement: Audit log for critical actions
The system SHALL record audit log entries for the following actions: login attempts, role assignments, workshop create/update/cancel, and token revocation.

#### Scenario: Login event logged
- **WHEN** a user successfully or unsuccessfully attempts to log in
- **THEN** the system writes an audit record containing user_id (if resolvable), IP address, action type, and timestamp

#### Scenario: Role change logged
- **WHEN** an ADMIN assigns or removes a role from another user
- **THEN** the system writes an audit record containing actor_id, target_user_id, role, action, and timestamp
