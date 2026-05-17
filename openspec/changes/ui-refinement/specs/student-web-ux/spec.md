## ADDED Requirements

### Requirement: Payment flow shows step progress indicator
PaymentCheckoutPage SHALL display a step indicator showing current position in the registration→payment→confirmation flow.

#### Scenario: Step 1 active — Review
- **WHEN** user is reviewing workshop details before payment
- **THEN** step indicator shows Step 1 "Review" as active, Steps 2 and 3 as inactive

#### Scenario: Step 2 active — Payment
- **WHEN** user is on the payment form (Stripe card input)
- **THEN** step indicator shows Step 2 "Payment" as active

#### Scenario: Step 3 active — Confirmation
- **WHEN** payment is successful
- **THEN** step indicator shows Step 3 "Confirmed" as active with success styling

### Requirement: QR code in My Registrations supports fullscreen view
MyRegistrationsPage SHALL allow users to view their registration QR code in fullscreen mode for easier scanning.

#### Scenario: Open fullscreen
- **WHEN** user taps the QR code or a "Fullscreen" button
- **THEN** QR code fills the screen (or a fullscreen overlay) for easy scanning

#### Scenario: Close fullscreen
- **WHEN** user taps outside the QR or presses back
- **THEN** fullscreen view closes and user returns to registrations list

### Requirement: QR code in My Registrations can be saved to device
MyRegistrationsPage SHALL provide a "Save QR" button that downloads the QR code as an image file.

#### Scenario: Save QR code
- **WHEN** user taps "Save QR" button
- **THEN** QR code image is downloaded to the device as a PNG file named with the workshop name

### Requirement: Skeleton loading replaces spinner in student-web
WorkshopListPage and WorkshopDetailPage SHALL display skeleton placeholders while data is loading instead of a spinner.

#### Scenario: Workshop list loading
- **WHEN** WorkshopListPage is fetching workshops
- **THEN** 3 skeleton card placeholders are shown instead of a spinner

#### Scenario: Workshop detail loading
- **WHEN** WorkshopDetailPage is fetching workshop data
- **THEN** skeleton placeholders match the layout of the actual content (title, description, seat count)
