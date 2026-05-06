# Delta for Payment

## ADDED Requirements

### Requirement: Async Payment Intent with Webhook Confirmation
The system MUST process paid workshop registrations via an asynchronous payment intent flow. Registration confirmation MUST only happen through a verified webhook, never from client-side redirect.

#### Scenario: Student initiates payment for a paid workshop
- GIVEN a student has a registration with status `PENDING_PAYMENT` and a held slot
- WHEN the Payment Module creates a payment record
- THEN the payment status is set to `INITIATED`
- AND the Payment Adapter calls the gateway to create a payment intent with an idempotency key
- AND the gateway returns a payment URL and intent ID
- AND the student is redirected to the gateway to complete payment

#### Scenario: Payment succeeds via webhook
- GIVEN the student has completed payment at the gateway
- WHEN the gateway sends a signed webhook to the Backend API
- THEN the backend verifies the webhook's HMAC signature
- AND the Payment Module updates the payment status to `SUCCEEDED`
- AND the Registration Module transitions the registration to `CONFIRMED`
- AND `held_count` is decreased and `confirmed_count` is increased
- AND a QR code is generated for the student
- AND the Notification Module sends confirmation via in-app and email

#### Scenario: Duplicate webhook received
- GIVEN a webhook for a payment that has already been processed
- WHEN the gateway sends the same webhook again
- THEN the backend returns `200 OK`
- AND does NOT update seat counts or create duplicate records

---

### Requirement: Payment Idempotency
The system MUST ensure each registration attempt produces at most one payment transaction, even under retries.

#### Scenario: Student clicks pay multiple times
- GIVEN a registration with status `PENDING_PAYMENT`
- WHEN the student submits multiple payment requests for the same registration
- THEN only one payment intent is created (identified by idempotency key)
- AND subsequent requests return the existing payment intent

---

### Requirement: Payment Failure Handling
The system MUST handle payment failures gracefully, releasing held slots when appropriate.

#### Scenario: Payment fails
- GIVEN a payment attempt that fails at the gateway
- WHEN the failure is reported via webhook
- THEN the registration transitions to `FAILED` or awaits retry per policy
- AND the held slot is released if no further payment is pending

#### Scenario: Webhook arrives after hold expiration
- GIVEN a successful payment webhook arrives after `hold_expires_at` has passed
- WHEN the backend processes the webhook
- THEN the registration is moved to `NEEDS_REVIEW` or a refund is initiated per policy

---

### Requirement: Gateway Timeout Handling
The system MUST handle gateway timeouts without losing the registration or requiring the student to re-register.

#### Scenario: Gateway timeout when creating intent
- GIVEN the Payment Adapter calls the gateway to create a payment intent
- WHEN the gateway does not respond within the timeout period
- THEN the registration remains in `PENDING_PAYMENT` within the hold window
- AND a reconciliation worker may retry or reconcile later

#### Scenario: Client timeout after payment
- GIVEN the student completed payment but the client timed out before receiving confirmation
- WHEN the gateway sends the webhook independently
- THEN the backend processes the webhook and confirms the registration
- AND the student does not need to pay again

---

### Requirement: Circuit Breaker for Payment Gateway
The system MUST implement a circuit breaker to isolate payment gateway failures from the rest of the system.

#### Scenario: Gateway experiences continuous failures
- GIVEN the payment gateway fails 5 consecutive times within 30 seconds
- WHEN the circuit breaker transitions to `Open`
- THEN no new payment intent requests are sent to the gateway
- AND the system waits 30 seconds before transitioning to `Half-Open`

#### Scenario: Circuit breaker recovery
- GIVEN the circuit breaker is in `Half-Open` state
- WHEN 3 consecutive probe requests succeed
- THEN the circuit breaker transitions back to `Closed`
- AND normal payment processing resumes

#### Scenario: Gateway down, other features unaffected
- GIVEN the circuit breaker is `Open`
- WHEN students browse workshop listings or register for free workshops
- THEN those features continue to work normally

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Idempotency key | Unique per registration per attempt | Prevents duplicate payment intents |
| `payment_intent_id` | UNIQUE constraint | One intent per payment record |
| Webhook authentication | HMAC signature verification | Prevents spoofed webhooks |
| Confirmation source | Webhook only | Client redirect is NOT trusted for confirmation |
| Circuit breaker: Open threshold | 5 failures in 30 seconds | Limits cascade from gateway outage |
| Circuit breaker: Half-Open wait | 30 seconds | Recovery probe delay |
| Circuit breaker: Close threshold | 3 successful probes | Confirms gateway recovery |
