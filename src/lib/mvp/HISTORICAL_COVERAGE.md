# Historical people served and program/cohort coverage

## Implemented locally

`programSummaries` groups authorized, filtered course offerings by program. It deduplicates enrolled/started/completed learner IDs within each program and distinguishes unique enrolled learners from course enrollment counts. A completion means at least one course completion, not completion of all program requirements. Missing offering milestone evidence keeps the program metric null. No learner IDs are returned by the aggregation.

The selected date, location, learner-status, course and access boundaries remain in the dashboard loader. These are selected-accessible-offering summaries, not necessarily the entire program. Historical and cohort coverage are explicit unavailable metadata; no new UI is added.

## Existing source limitations

- `removeStudentTrack` deletes current enrollment rows; assignment upserts can change program ownership. The current roster is not an enrollment-history ledger.
- `alumni_enrollments.sql` defines imported historical enrollment records with email, program/course, source and optional enrolled date. It does not contain verified kickoff attendance or completion evidence. Enrollment alone does not satisfy Mica's started/completed definition. Email matching also requires an agreed identity policy before combining historical and current unique-person counts.
- `students.cohort_id` is a single current profile assignment, not a learner/course/cohort membership history. `cohort_track_scoped.sql` explicitly cleared incorrect assignments. Attendance is keyed by learner/course/week/session, not cohort occurrence; shared course activity cannot safely be assigned to a historical cohort.
- Removed profiles and hidden courses are outside current dashboard coverage. Current staff/test exclusions are not historical eligibility proof.

## Required decision before completing item 1

Identify an authoritative historical source with program/course/cohort occurrence, stable person identity and verified start/completion evidence; confirm historical staff/test exclusions and access rules. If no source exists, approve a separate historical ledger/import design and cohort-membership linkage. A new table alone cannot recover deleted history. No schema change, backfill, guessed milestone or dev/prod write was performed here.

Item 1 remains partial: program aggregation is implemented; all-time served totals and cohort-result aggregation are blocked on historical evidence/membership sources.
