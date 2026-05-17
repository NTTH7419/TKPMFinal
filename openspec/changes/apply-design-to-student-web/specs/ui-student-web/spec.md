## ADDED Requirements

### Requirement: Student-web pages use the shared design system
All user-facing pages and shared components in `apps/student-web` SHALL render using components and tokens from `@unihub/ui` as defined in `DESIGN.md`. Observable behavior — API calls, form validation, state transitions, side effects, and accessibility contracts — SHALL remain unchanged across the refactor.

#### Scenario: Refactor preserves behavior on LoginPage
- **WHEN** `LoginPage` is migrated to `@unihub/ui`
- **THEN** all RTL parity tests covering the login golden path and error states pass without modification
- **AND** the network request to `POST /auth/login` is identical to the pre-refactor baseline

#### Scenario: Refactor preserves behavior on WorkshopListPage
- **WHEN** `WorkshopListPage` is migrated to `@unihub/ui`
- **THEN** all RTL parity tests covering workshop listing and seat-badge display pass without modification
- **AND** the network request to `GET /workshops` is identical to the pre-refactor baseline

#### Scenario: Refactor preserves behavior on WorkshopDetailPage
- **WHEN** `WorkshopDetailPage` is migrated to `@unihub/ui`
- **THEN** all RTL parity tests covering detail rendering and register-CTA interaction pass without modification
- **AND** the network request to `GET /workshops/:id` and `POST /registrations` are identical to the pre-refactor baseline

#### Scenario: Refactor preserves behavior on MyRegistrationsPage
- **WHEN** `MyRegistrationsPage` is migrated to `@unihub/ui`
- **THEN** all RTL parity tests covering registration list and status badges pass without modification
- **AND** the network request to `GET /registrations` is identical to the pre-refactor baseline

#### Scenario: Refactor preserves behavior on PaymentCheckoutPage
- **WHEN** `PaymentCheckoutPage` is migrated to `@unihub/ui` at the parallel route `/checkout-v1`
- **THEN** all RTL parity tests covering the payment submission golden path and error state pass without modification
- **AND** the network request to `POST /payments` is identical to the pre-refactor baseline

#### Scenario: Refactor preserves behavior on NotificationBell
- **WHEN** `NotificationBell` is migrated to `@unihub/ui` Badge and Button primitives
- **THEN** all RTL parity tests covering unread count display and mark-as-read interaction pass without modification
- **AND** the network requests to `GET /notifications` and `PATCH /notifications/:id` are identical to the pre-refactor baseline

### Requirement: Payment redesign ships behind a parallel route for one deployment window
The redesigned `PaymentCheckoutPage` SHALL be accessible at `/checkout-v1` for at least one deployment window before the routes are swapped.

#### Scenario: Old checkout route remains available during validation window
- **WHEN** the `PaymentCheckoutPage` refactor commit is deployed
- **THEN** the original `/checkout` route continues to serve the pre-refactor markup
- **AND** `/checkout-v1` serves the new `@unihub/ui`-based markup

#### Scenario: Rollback is instantaneous
- **WHEN** a regression is detected in the new checkout UI
- **THEN** the navigation link can be pointed back to `/checkout` without a redeploy
