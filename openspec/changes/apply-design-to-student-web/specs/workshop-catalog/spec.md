## ADDED Requirements

### Requirement: Workshop catalog pages UI surfaces use the shared design system
`WorkshopListPage` and `WorkshopDetailPage` in `apps/student-web` SHALL render using components and tokens from `@unihub/ui`. Observable behavior — API calls, SSE seat-stream connection, navigation on card/CTA click, and registration submission — SHALL remain unchanged across the refactor.

#### Scenario: Refactor preserves workshop listing behavior
- **WHEN** `WorkshopListPage` is migrated to `@unihub/ui`
- **THEN** all integration tests covering the listing golden path and seat-badge states (seats available, seats full) pass without modification
- **AND** the `GET /workshops` request is identical to the pre-refactor baseline
- **AND** the SSE hook `useSeatStream` is invoked with the same workshop ID for each card

#### Scenario: Refactor preserves workshop detail behavior
- **WHEN** `WorkshopDetailPage` is migrated to `@unihub/ui`
- **THEN** all integration tests covering detail rendering, register-CTA, and payment redirect pass without modification
- **AND** the `GET /workshops/:id` and `POST /registrations` requests are identical to the pre-refactor baseline
