## ADDED Requirements

### Requirement: Mock payment gateway adapter
The system SHALL implement a `MockPaymentAdapter` that fulfils the `PaymentAdapter` interface. A mock checkout endpoint `POST /mock-payment/pay/:intentId` simulates payment outcomes. Webhooks MUST be signed with HMAC-SHA256 using a fixed secret so that the webhook handler can verify authenticity.

#### Scenario: Create payment intent
- **WHEN** a student registers for a paid workshop and the backend calls `PaymentAdapter.createIntent()`
- **THEN** the mock adapter creates a payment intent with a unique `payment_intent_id` and returns a mock payment URL pointing to the mock checkout page

#### Scenario: Simulate successful payment
- **WHEN** the user confirms payment on the mock checkout page
- **THEN** the mock adapter sends a signed webhook to `POST /payments/webhook` and the backend verifies the signature and processes the event

### Requirement: Circuit breaker for the payment gateway
The system SHALL implement a three-state circuit breaker (Closed / Open / Half-Open) for all payment gateway calls. State MUST be stored in Redis. Thresholds: 5 consecutive failures within 30 s → Open; after 30 s → Half-Open; 3 successful probes → Closed.

#### Scenario: Circuit opens after repeated gateway failures
- **WHEN** the MockPaymentAdapter returns an error 5 times consecutively within 30 seconds
- **THEN** the circuit transitions to Open and all new paid-workshop registration attempts immediately receive a 503 response with the message "Payment temporarily unavailable"

#### Scenario: Graceful degradation while circuit is Open
- **WHEN** the circuit is in the Open state
- **THEN** workshop listing, workshop detail, and free workshop registration all continue to function normally

#### Scenario: Circuit recovers via Half-Open probes
- **WHEN** the circuit transitions to Half-Open after 30 s and 3 consecutive probe requests succeed
- **THEN** the circuit resets to Closed and paid workshop registration resumes normally

### Requirement: Idempotency key for payment
The system SHALL store `payments.idempotency_key` (30-day TTL) and enforce a unique constraint on `payments.payment_intent_id`. The webhook handler MUST be idempotent on `payment_intent_id`.

#### Scenario: Client retries payment intent creation
- **WHEN** a client resends a payment intent request with the same idempotency key within 30 days
- **THEN** the backend returns the previously created payment intent without calling the gateway again

#### Scenario: Duplicate webhook delivery
- **WHEN** the gateway delivers the same webhook event more than once
- **THEN** the backend processes it only the first time; subsequent deliveries return 200 OK without changing state

### Requirement: Auto-refund when hold expires after payment succeeds
The system SHALL automatically issue a refund when a successful payment webhook arrives but the hold slot has already expired and the registration is in EXPIRED status.

#### Scenario: Late webhook after hold expiration
- **WHEN** a payment-succeeded webhook arrives after `hold_expires_at` has passed and the registration is EXPIRED
- **THEN** the backend records payment as SUCCEEDED, calls `MockPaymentAdapter.refund()` with an idempotency key, and the registration remains EXPIRED
