## ADDED Requirements

### Requirement: Admin-web uses URL-based routing
Admin-web SHALL use React Router DOM v6 so that each view has a unique URL path and browser navigation (back/forward) works correctly.

#### Scenario: Navigate to workshop list
- **WHEN** user visits `/workshops`
- **THEN** WorkshopListPage renders

#### Scenario: Navigate to workshop detail
- **WHEN** user visits `/workshops/:id`
- **THEN** WorkshopDetailPage renders with data for the given workshop id

#### Scenario: Navigate to import history
- **WHEN** user visits `/import-history`
- **THEN** ImportHistoryPage renders

#### Scenario: Unauthenticated redirect
- **WHEN** unauthenticated user visits any protected route
- **THEN** user is redirected to `/login`

#### Scenario: Browser back button
- **WHEN** user navigates from workshop detail back using browser back button
- **THEN** user returns to workshop list at `/workshops`

### Requirement: Student-web uses URL-based routing
Student-web SHALL use React Router DOM v6 so that each view has a unique URL path and browser navigation works correctly.

#### Scenario: Navigate to workshop list
- **WHEN** user visits `/workshops`
- **THEN** WorkshopListPage renders

#### Scenario: Navigate to workshop detail
- **WHEN** user visits `/workshops/:id`
- **THEN** WorkshopDetailPage renders with seat SSE stream active for that workshop

#### Scenario: Navigate to my registrations
- **WHEN** user visits `/my-registrations`
- **THEN** MyRegistrationsPage renders showing the user's registrations

#### Scenario: Navigate to payment checkout
- **WHEN** user visits `/payment/:registrationId`
- **THEN** PaymentCheckoutPage renders for the given registration

#### Scenario: Unauthenticated redirect
- **WHEN** unauthenticated user visits any protected route
- **THEN** user is redirected to `/login`

### Requirement: Auth state persists across route changes
Both admin-web and student-web SHALL preserve authentication state when navigating between routes (token stored in localStorage, not in component state).

#### Scenario: Auth token survives navigation
- **WHEN** user navigates between routes after logging in
- **THEN** user remains authenticated and does not need to log in again
