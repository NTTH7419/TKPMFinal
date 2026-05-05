## ADDED Requirements

### Requirement: Nightly scheduler detects new CSV via checksum
The system SHALL run a scheduled job (cron) every night, scan Supabase Storage for CSV files, compute SHA-256 checksums, and skip any file whose checksum already exists in `student_import_batches`.

#### Scenario: New CSV file detected
- **WHEN** the scheduler runs and finds a CSV file with a checksum not present in the database
- **THEN** a `student_import_batch` record is created with status=PARSING and an import job is published to the queue

#### Scenario: Previously imported CSV file encountered
- **WHEN** the scheduler finds a file whose checksum already exists in `student_import_batches`
- **THEN** the file is skipped; no new batch is created

### Requirement: Batch sequential pipeline — parse, stage, validate, promote
The system SHALL process the CSV in a sequential pipeline: parse each row into the `student_import_rows` staging table, validate headers and required fields and detect duplicates, then atomically promote valid rows into `students` if the error rate is below the threshold.

#### Scenario: Valid CSV file promoted successfully
- **WHEN** the CSV is parsed and the error row percentage is below `error_threshold_pct`
- **THEN** a transaction upserts all valid rows into the `students` table and the batch transitions to PROMOTED

#### Scenario: CSV file with excessive error rate
- **WHEN** the CSV error row percentage exceeds `error_threshold_pct`
- **THEN** the batch transitions to REJECTED and the `students` table remains unchanged

#### Scenario: Worker crashes during promotion
- **WHEN** the worker process dies mid-transaction during atomic promotion
- **THEN** the transaction rolls back automatically and the batch can be safely retried

### Requirement: Import does not disrupt the running system
The system SHALL allow students to register for workshops normally while a CSV import job is in progress.

#### Scenario: Registration while import is running
- **WHEN** an import batch is in PARSING or VALIDATING state
- **THEN** the Registration API continues to operate normally using the current `students` table data

### Requirement: Immediately mark absent students as INACTIVE
The system SHALL mark `students.status = INACTIVE` within the same promotion transaction for any student_code that does not appear in the latest CSV file.

#### Scenario: Student absent from the new CSV
- **WHEN** a new CSV is successfully promoted and a student_code does not appear in it
- **THEN** the corresponding student record is set to INACTIVE within the same promotion transaction

### Requirement: Batch report for Admins
The system SHALL allow ORGANIZER and ADMIN to view a detailed report for each import batch: total_rows, valid_rows, error_rows, and a list of error rows with error_message.

#### Scenario: View batch report
- **WHEN** an ORGANIZER calls `GET /admin/imports/students/:batchId`
- **THEN** the backend returns full batch metadata and the list of student_import_rows with row_status and error_message for each error row
