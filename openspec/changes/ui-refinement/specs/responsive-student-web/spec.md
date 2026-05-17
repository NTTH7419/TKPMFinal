## ADDED Requirements

### Requirement: Student-web is usable on mobile screens
Student-web SHALL render correctly on screens 375px wide and above (iPhone SE baseline) without horizontal overflow or overlapping elements.

#### Scenario: Workshop list on mobile
- **WHEN** user views WorkshopListPage on a 375px screen
- **THEN** workshop cards stack vertically and all content is readable without horizontal scroll

#### Scenario: Workshop detail on mobile
- **WHEN** user views WorkshopDetailPage on a 375px screen
- **THEN** workshop info, seat count, and register button are all visible and tappable

#### Scenario: Payment checkout on mobile
- **WHEN** user views PaymentCheckoutPage on a 375px screen
- **THEN** payment form fields are full-width and Stripe card input is functional

#### Scenario: My Registrations QR code on mobile
- **WHEN** user views MyRegistrationsPage on a 375px screen
- **THEN** QR code is centered and large enough to be scanned (minimum 200px)

### Requirement: Navigation header is responsive
The navigation header in student-web SHALL adapt layout for small screens — collapsing or stacking navigation items as needed.

#### Scenario: Header on desktop
- **WHEN** user views student-web on a screen wider than 768px
- **THEN** navigation links display horizontally in the header

#### Scenario: Header on mobile
- **WHEN** user views student-web on a screen narrower than 768px
- **THEN** navigation items remain accessible (hamburger menu or stacked layout)
