## ADDED Requirements

### Requirement: MyRegistrationsPage UI surfaces use the shared design system
`MyRegistrationsPage` in `apps/student-web` SHALL render using components and tokens from `@unihub/ui`. Observable behavior — API call to `GET /registrations`, status badge values, and cancel interaction — SHALL remain unchanged across the refactor.

#### Scenario: Refactor preserves registration list behavior
- **WHEN** `MyRegistrationsPage` is migrated to `@unihub/ui`
- **THEN** all integration tests covering the registrations list golden path and empty-state pass without modification
- **AND** the `GET /registrations` request is identical to the pre-refactor baseline
- **AND** status badge labels rendered to the DOM are identical to the pre-refactor baseline (`CONFIRMED`, `PENDING_PAYMENT`, `CANCELLED`)
