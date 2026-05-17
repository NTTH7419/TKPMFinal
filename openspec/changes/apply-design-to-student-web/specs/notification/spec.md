## ADDED Requirements

### Requirement: NotificationBell UI surfaces use the shared design system
`NotificationBell` in `apps/student-web` SHALL render using `@unihub/ui` Badge and Button primitives. Observable behavior — polling for `GET /notifications`, unread count display, and `PATCH /notifications/:id` mark-as-read side effect — SHALL remain unchanged across the refactor.

#### Scenario: Refactor preserves notification bell behavior
- **WHEN** `NotificationBell` is migrated to `@unihub/ui` primitives
- **THEN** all integration tests covering unread count rendering and mark-as-read interaction pass without modification
- **AND** the `GET /notifications` and `PATCH /notifications/:id` requests are identical to the pre-refactor baseline
- **AND** the unread count number rendered inside the badge is identical to the pre-refactor baseline
