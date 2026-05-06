# Delta for Auth & RBAC

## ADDED Requirements

### Requirement: JWT-Based Stateless Authentication
The system MUST use JWT (JSON Web Token) for stateless authentication with short-lived access tokens and rotatable refresh tokens.

#### Scenario: User logs in with valid credentials
- GIVEN a user with `status = ACTIVE`
- WHEN the user submits a valid email and password
- THEN the backend verifies the password using bcrypt hash
- AND issues an access token (JWT, TTL 15 minutes) containing `user_id`, `roles[]`, `iat`, `exp`
- AND issues a refresh token (JWT, TTL 7 days) containing `user_id`, `jti`, `exp`
- AND the access token is stored in client memory
- AND the refresh token is stored in an HTTP-only cookie

#### Scenario: User logs in with invalid credentials
- GIVEN any user
- WHEN the user submits an incorrect email or password
- THEN the backend returns `401 Unauthorized`

#### Scenario: Locked account login attempt
- GIVEN a user with `status = LOCKED`
- WHEN the user submits valid credentials
- THEN the backend returns `403 Forbidden`

---

### Requirement: Token Refresh and Rotation
The system MUST support automatic access token refresh using refresh tokens, with mandatory rotation on each use.

#### Scenario: Access token expired, valid refresh token
- GIVEN an authenticated user whose access token has expired
- WHEN the client sends the refresh token to `POST /auth/refresh`
- THEN the backend verifies the refresh token is still valid and its `jti` is not in the Redis blocklist
- AND issues a new access token (15 minutes) and a new refresh token (7 days)
- AND revokes the old refresh token by storing its `jti` in Redis with TTL = remaining time

#### Scenario: Refresh token expired or revoked
- GIVEN a refresh token that has expired or whose `jti` is in the Redis blocklist
- WHEN the client sends it to `POST /auth/refresh`
- THEN the backend returns `401 Unauthorized`
- AND the client must redirect the user to the login page

#### Scenario: Replay of already-used refresh token
- GIVEN a refresh token that has already been rotated
- WHEN the old refresh token is sent to `POST /auth/refresh`
- THEN the backend rejects it (its `jti` is in the Redis blocklist)
- AND returns `401 Unauthorized`

---

### Requirement: Role-Based Access Control (RBAC)
The system MUST enforce RBAC on the backend using guard middleware. Frontend visibility MUST NOT be relied upon for access control.

#### Scenario: Student tries to access workshop admin API
- GIVEN an authenticated user with role `STUDENT`
- WHEN the user calls an API endpoint restricted to `ORGANIZER` or `ADMIN`
- THEN the backend returns `403 Forbidden`

#### Scenario: Check-in staff tries to access admin workshop API
- GIVEN an authenticated user with role `CHECKIN_STAFF`
- WHEN the user calls an API restricted to `ORGANIZER` or `ADMIN`
- THEN the backend returns `403 Forbidden`

#### Scenario: Organizer tries to access student private data
- GIVEN an authenticated user with role `ORGANIZER`
- WHEN the user attempts to access another student's personal QR endpoint
- THEN the backend checks ownership (`student_id` or `user_id`) and returns `403 Forbidden`

#### Scenario: Admin assigns role to a user
- GIVEN an authenticated user with role `ADMIN`
- WHEN the admin assigns a new role to a target user
- THEN the role is saved to the database
- AND an audit log entry is created

---

### Requirement: Password Security
The system MUST hash passwords using bcrypt with a cost factor ≥ 12. Plaintext, MD5, and SHA-1 MUST NOT be used.

#### Scenario: Password storage on registration
- GIVEN a new user registering an account
- WHEN the user submits a password
- THEN the backend hashes it with bcrypt (cost factor ≥ 12) before storing

---

### Requirement: Webhook Authentication
The system MUST authenticate payment gateway webhooks using HMAC signature verification, not user role-based auth.

#### Scenario: Payment gateway sends a webhook
- GIVEN a payment gateway configured with a shared HMAC secret
- WHEN the gateway sends a signed webhook to the backend
- THEN the backend verifies the HMAC signature
- AND processes the webhook only if the signature is valid

---

### Requirement: Audit Logging for Security-Critical Actions
The system MUST record audit logs for security-critical actions.

#### Scenario: Auditable actions
- GIVEN any of the following actions occur: login, role change, workshop create/cancel, token revoke
- THEN an audit log entry is created with the action details, actor, and timestamp

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Access Token TTL | 15 minutes | Short-lived to mitigate inability to revoke JWT early |
| Refresh Token TTL | 7 days | Balances security and user convenience |
| Access Token Storage | Client memory | Prevents XSS-based token theft from storage |
| Refresh Token Storage | HTTP-only cookie | Prevents JavaScript access to refresh token |
| Password Hashing | bcrypt, cost factor ≥ 12 | Industry-standard, resistant to brute force |
| Token Rotation | Mandatory on each refresh | Prevents replay attacks with old refresh tokens |
| Authorization Enforcement | Backend guards only | Frontend visibility is NOT a security boundary |
| Webhook Auth | HMAC signature | Independent from user role system |
