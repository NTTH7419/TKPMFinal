## ADDED Requirements

### Requirement: PDF upload triggers the summary pipeline
The system SHALL allow an ORGANIZER to upload a PDF file (max 20 MB) for a workshop. The upload MUST be saved to Supabase Storage and a job MUST be published to the queue. The upload endpoint MUST return immediately without waiting for AI processing to complete.

#### Scenario: Successful PDF upload
- **WHEN** an ORGANIZER sends `POST /admin/workshops/:id/documents` with a valid PDF file
- **THEN** the file is saved to Supabase Storage, the AI_SUMMARY_REQUESTED job is published, and the response returns immediately with document metadata and summary_status=PENDING

#### Scenario: File exceeds 20 MB
- **WHEN** an ORGANIZER uploads a PDF larger than 20 MB
- **THEN** the backend rejects the request immediately with FILE_TOO_LARGE and does not store the file

### Requirement: Pipe-and-filter AI summary pipeline
The system SHALL process the PDF through a sequential pipeline of independent filters: Extract text → Clean text → Chunk (≤ 3,000 tokens per chunk) → Call AI model → Validate output → Save summary. Each filter MUST be a discrete, replaceable step in the worker.

#### Scenario: Successful pipeline run
- **WHEN** the worker receives an AI_SUMMARY_REQUESTED job
- **THEN** the worker runs the filters in sequence: extract → clean → chunk → call AI → validate → saves ai_summary and transitions summary_status to AI_GENERATED

#### Scenario: AI model timeout or error — retry up to 3 times
- **WHEN** the AI model returns an error or times out
- **THEN** the worker retries the call with exponential backoff, up to a maximum of 3 attempts

#### Scenario: AI call fails after 3 retries
- **WHEN** all 3 AI call attempts fail
- **THEN** summary_status transitions to SUMMARY_FAILED with an error_reason recorded; the workshop continues to display normally without a summary

### Requirement: Auto-publish AI summary
The system SHALL automatically publish the summary after a successful pipeline run, setting summary_status=AI_GENERATED. Students MUST be able to see the summary on the workshop detail page. An ORGANIZER MAY manually edit the summary, which transitions the status to ADMIN_EDITED.

#### Scenario: Summary visible to students
- **WHEN** summary_status is AI_GENERATED or ADMIN_EDITED
- **THEN** `GET /workshops/:id` includes the ai_summary field in the response

#### Scenario: AI failure does not affect the workshop
- **WHEN** summary_status is SUMMARY_FAILED
- **THEN** the workshop remains fully functional; the detail page displays without a summary section or shows a "Processing" indicator
