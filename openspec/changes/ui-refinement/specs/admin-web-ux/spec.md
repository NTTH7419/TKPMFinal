## ADDED Requirements

### Requirement: Admin can search attendees in WorkshopDetailPage
WorkshopDetailPage SHALL provide a search/filter input allowing admin to filter the attendee list by name or email in real-time.

#### Scenario: Filter by name
- **WHEN** admin types a name in the search input
- **THEN** attendee list filters to show only rows where name contains the search term (case-insensitive)

#### Scenario: Filter by email
- **WHEN** admin types an email fragment in the search input
- **THEN** attendee list filters to show only rows where email contains the search term

#### Scenario: Clear filter
- **WHEN** admin clears the search input
- **THEN** full attendee list is restored

### Requirement: ImportHistoryPage has pagination
ImportHistoryPage SHALL paginate import history records, showing at most 20 records per page.

#### Scenario: First page loads
- **WHEN** admin views ImportHistoryPage
- **THEN** up to 20 most recent import records are displayed with page controls

#### Scenario: Navigate to next page
- **WHEN** admin clicks "Next" page button
- **THEN** next 20 records are displayed

#### Scenario: No previous page on first page
- **WHEN** admin is on page 1
- **THEN** "Previous" button is disabled

### Requirement: Skeleton loading replaces spinner in admin-web
WorkshopListPage and WorkshopDetailPage in admin-web SHALL display skeleton placeholders while data is loading.

#### Scenario: Workshop list loading
- **WHEN** WorkshopListPage is fetching workshops
- **THEN** skeleton row placeholders are shown instead of a spinner

#### Scenario: Workshop detail attendee list loading
- **WHEN** WorkshopDetailPage is fetching attendees
- **THEN** skeleton row placeholders match the attendee table layout
