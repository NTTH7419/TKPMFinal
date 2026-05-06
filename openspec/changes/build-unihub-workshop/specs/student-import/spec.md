# Delta for Student Import

## ADDED Requirements

### Requirement: CSV-Based Student Data Import
The system MUST import student data from CSV files exported by the legacy system, using a safe staging-then-promote workflow that protects production data from malformed files.

#### Scenario: Scheduler detects a new CSV file
- GIVEN the legacy system exports a CSV file to the import folder or object storage
- WHEN the scheduler detects a new file (by filename or checksum)
- THEN a `student_import_batch` record is created with status `PARSING`
- AND the CSV worker begins processing the file

#### Scenario: Worker parses a valid CSV file
- GIVEN a new CSV file is detected
- WHEN the worker parses the file in batches
- THEN rows are inserted into the `student_import_rows` staging table
- AND the worker validates headers, required fields, email format, student code format, duplicates, and status
- AND each row is marked as valid or invalid with specific error details

---

### Requirement: Staging-to-Production Promotion
The system MUST only promote validated rows to the `students` table in an atomic transaction. Direct insertion into the `students` table is NOT allowed.

#### Scenario: Batch with errors below threshold is promoted
- GIVEN a parsed batch where invalid rows are below the configured error threshold
- WHEN the worker triggers promotion
- THEN the worker opens a database transaction
- AND upserts valid rows into the `students` table
- AND each student record gets `source_batch_id` and `last_seen_in_import_at` updated
- AND the batch status transitions to `PROMOTED`
- AND an admin report is generated

#### Scenario: Batch with excessive errors is rejected
- GIVEN a parsed batch where the error count exceeds the threshold (e.g., missing required columns)
- WHEN the worker evaluates the batch
- THEN the batch status is set to `REJECTED`
- AND the `students` table remains unchanged

---

### Requirement: Duplicate File Detection
The system MUST detect and skip CSV files that have already been imported.

#### Scenario: Same file uploaded again
- GIVEN a CSV file with a checksum matching a previously imported file
- WHEN the scheduler detects the file
- THEN the file is skipped or marked as `DUPLICATE`
- AND no new batch is created

---

### Requirement: Per-Row Error Tracking
The system MUST record validation errors at the row level so administrators can inspect which rows failed and why.

#### Scenario: Individual rows fail validation
- GIVEN a CSV row with an invalid email or missing student code
- WHEN the worker validates the row
- THEN the error is recorded in `student_import_rows` with the specific error detail
- AND the row is NOT promoted to the `students` table

#### Scenario: Admin reviews import results
- GIVEN a batch has been processed (PROMOTED or REJECTED)
- WHEN an admin views the batch report
- THEN the admin sees the count of successful rows, failed rows, and error details per row

---

### Requirement: Worker Crash Recovery
The system MUST handle worker crashes during parse and promote phases without data corruption.

#### Scenario: Worker crashes during parsing
- GIVEN the worker crashes while parsing a CSV file
- WHEN the worker restarts
- THEN it retries processing from the original file

#### Scenario: Worker crashes during promotion
- GIVEN the worker crashes during the promotion transaction
- WHEN the worker restarts
- THEN the transaction is rolled back automatically
- AND the `students` table remains unchanged

---

### Requirement: Inactive Student Handling
The system MUST NOT delete students who are absent from a new CSV import. Instead, they may be marked as `INACTIVE` per policy.

#### Scenario: Previously imported student not in new CSV
- GIVEN a student exists in the `students` table from a previous import
- WHEN a new CSV import does not include that student
- THEN the student is NOT deleted
- AND may be transitioned to `INACTIVE` status based on configured policy

---

### Requirement: Non-Blocking Import
The system MUST allow students to register for workshops while a CSV import is in progress.

#### Scenario: Registration during active import
- GIVEN a CSV import batch is currently being processed
- WHEN a student submits a registration request
- THEN the registration is processed normally without being blocked by the import

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Import target | `student_import_rows` staging table | Never insert directly into `students` |
| Promotion | Atomic database transaction | Ensures all-or-nothing promotion |
| Student code | UNIQUE constraint on `student_code` | Prevents duplicates in production |
| Audit | Batch record with status and row-level errors | Admin visibility into import results |
| Duplicate detection | File checksum comparison | Avoids reprocessing identical files |
| Crash safety | Transaction rollback on failure | Protects data integrity |
| Concurrency | Import does not block registration | System remains available during import |
