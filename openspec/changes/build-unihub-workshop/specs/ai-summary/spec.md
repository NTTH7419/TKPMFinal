# Delta for AI Summary

## ADDED Requirements

### Requirement: Async PDF Processing
The system MUST process uploaded PDFs asynchronously via a background worker without blocking the upload request.

#### Scenario: Organizer uploads a valid PDF
- GIVEN an authenticated ORGANIZER
- WHEN the organizer uploads a PDF file ≤ 20 MB with MIME type `application/pdf`
- THEN the backend saves the file to object storage and returns a response within 2 seconds
- AND a workshop document is created with `summary_status = UPLOADED`
- AND a job `AI_SUMMARY_REQUESTED` is published to the message broker

#### Scenario: PDF exceeds size limit
- GIVEN an authenticated ORGANIZER
- WHEN the organizer uploads a PDF file > 20 MB
- THEN the backend rejects the request immediately
- AND returns `413 Payload Too Large`

#### Scenario: Non-PDF file uploaded
- GIVEN an authenticated ORGANIZER
- WHEN the organizer uploads a file with MIME type other than `application/pdf`
- THEN the backend rejects the request
- AND returns a validation error

---

### Requirement: AI Text Extraction and Summarization
The system MUST extract, clean, and chunk PDF text before calling the AI model, then validate the output before saving.

#### Scenario: Worker processes a readable PDF
- GIVEN a job `AI_SUMMARY_REQUESTED` is in the queue
- WHEN the worker picks up the job
- THEN the worker extracts text from the PDF
- AND cleans the text (removes repeated headers/footers and excess whitespace)
- AND splits the text into chunks of ≤ 3,000 tokens each
- AND calls the AI model for each chunk and merges the output
- AND validates the merged output (≥ 100 characters, no encoding errors, not truncated)
- AND saves `ai_summary` to the workshop document
- AND sets `summary_status = AI_GENERATED`
- AND the summary is automatically displayed on the workshop detail page

#### Scenario: AI call times out
- GIVEN the worker is calling the AI model for a chunk
- WHEN the AI call exceeds 30 seconds
- THEN the worker treats it as an error
- AND retries with exponential backoff: 1 min → 5 min → 15 min (max 3 attempts)
- AND after 3 consecutive failures, sets `summary_status = SUMMARY_FAILED` with an error reason

#### Scenario: AI returns invalid output
- GIVEN the worker receives an AI response
- WHEN the output is empty or fewer than 100 characters
- THEN the worker marks the job as failed
- AND records the error reason
- AND does NOT publish the summary

#### Scenario: PDF is corrupted or unreadable
- GIVEN the worker picks up a job for a corrupted, encrypted, or scan-only PDF
- WHEN text extraction fails
- THEN the worker sets `summary_status = SUMMARY_FAILED`
- AND records the error reason

---

### Requirement: Summary Status Tracking
The system MUST maintain a `summary_status` field on the workshop document to reflect the current state of AI processing.

#### Scenario: Status lifecycle
- GIVEN a PDF upload is received
- THEN `summary_status` transitions through:
  - `UPLOADED` → (worker processing) → `AI_GENERATED` or `SUMMARY_FAILED`
  - If admin edits the summary → `ADMIN_EDITED`

#### Scenario: Admin views processing status
- GIVEN an ADMIN or ORGANIZER viewing the workshop detail in Admin Web
- WHEN the AI summary is still processing or has failed
- THEN the current `summary_status` is visible
- AND any error reason is displayed when status is `SUMMARY_FAILED`

---

### Requirement: Admin Summary Editing
The system MUST allow ADMIN and ORGANIZER to manually edit the AI-generated summary after it has been created.

#### Scenario: Admin edits an AI-generated summary
- GIVEN a workshop with `summary_status = AI_GENERATED`
- WHEN the admin submits an edited summary
- THEN the summary is updated in the database
- AND `summary_status` is set to `ADMIN_EDITED`

#### Scenario: New PDF uploaded while processing is in progress
- GIVEN a workshop with an active AI processing job
- WHEN the admin uploads a new PDF
- THEN the existing job is cancelled
- AND a new job `AI_SUMMARY_REQUESTED` is created for the new PDF
- AND the old summary is retained until the new one succeeds

---

### Requirement: AI Processing Isolation
The system MUST ensure AI processing failures do not affect workshop visibility or registration.

#### Scenario: AI fails but workshop remains accessible
- GIVEN `summary_status = SUMMARY_FAILED` on a workshop
- WHEN a student views the workshop detail page
- THEN the workshop is still visible and registrable
- AND the summary section shows a graceful fallback (e.g., "Summary not available")

## Technical Constraints

| Parameter | Value | Reason |
| --- | --- | --- |
| Max PDF size | 20 MB | Prevents excessive bandwidth and parse time |
| Accepted MIME type | `application/pdf` | Only PDF; Word/image not supported |
| Chunk size | ≤ 3,000 tokens | Fits common context windows; avoids truncation |
| Timeout per AI call | 30 seconds | Exceeded → counted as error and retried |
| Max retries | 3 attempts | After 3 → `SUMMARY_FAILED` |
| Min output length | 100 characters | Shorter output treated as invalid |
| Processing mode | Async via BullMQ worker | Upload request MUST NOT block waiting for AI |
