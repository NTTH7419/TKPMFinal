## ADDED Requirements

### Requirement: PaymentCheckoutPage UI surfaces use the shared design system
`PaymentCheckoutPage` in `apps/student-web` SHALL render using components and tokens from `@unihub/ui`, deployed behind a parallel route `/checkout-v1` for at least one deployment window (per `UI_REFACTOR_PRINCIPLES.md` Mechanism 4). Observable behavior — `POST /payments` request shape, redirect URL on success, error handling — SHALL remain unchanged across the refactor.

#### Scenario: Refactor preserves checkout submission behavior
- **WHEN** `PaymentCheckoutPage` is migrated to `@unihub/ui` at `/checkout-v1`
- **THEN** all integration tests covering the payment golden path and failure states pass without modification
- **AND** the `POST /payments` request body and headers are identical to the pre-refactor baseline
- **AND** on success the redirect navigation target is identical to the pre-refactor baseline

#### Scenario: Old checkout route remains available during validation window
- **WHEN** the `PaymentCheckoutPage` refactor commit is deployed
- **THEN** `/checkout` continues to serve the original pre-refactor component
- **AND** `/checkout-v1` serves the new `@unihub/ui`-based component
