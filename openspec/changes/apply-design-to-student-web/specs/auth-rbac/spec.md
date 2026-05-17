## ADDED Requirements

### Requirement: LoginPage UI surfaces use the shared design system
The `LoginPage` in `apps/student-web` SHALL render using components and tokens from `@unihub/ui`. The capability's observable behavior — API call to `POST /auth/login`, form field validation, token storage in `localStorage`, error messages, and redirect on success — SHALL remain unchanged across the refactor.

#### Scenario: Refactor preserves login behavior
- **WHEN** `LoginPage` is migrated to `@unihub/ui`
- **THEN** all integration tests covering the login golden path and documented edge cases pass without modification
- **AND** the network request profile observed during the golden path (`POST /auth/login` with `{email, password}` body) is identical to the pre-refactor baseline
- **AND** on success `localStorage.setItem('access_token', ...)` and `localStorage.setItem('user', ...)` are called with the same values
- **AND** on failure the error message text rendered to the DOM is identical to the pre-refactor baseline
