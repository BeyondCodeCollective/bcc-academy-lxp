-- Performance indexes for the super-admin insights page.
-- The insights page runs cross-program (no program_id filter), so
-- program_id-based indexes don't apply. These covering indexes make
-- the date-range and full-scan queries index-only.
-- Idempotent; safe to re-run.

-- The active-7d query on attendance:
--   SELECT student_id FROM attendance WHERE checked_in_at >= ?
-- Without this index, Postgres seq scans the entire table.
create index if not exists idx_attendance_checked_in_student
  on attendance(checked_in_at, student_id);

-- The active-7d query on submissions:
--   SELECT student_id FROM submissions
--   WHERE submitted_at IS NOT NULL AND submitted_at >= ?
-- Partial index avoids unsubmitted rows.
create index if not exists idx_submissions_submitted_at_student
  on submissions(submitted_at, student_id)
  where submitted_at is not null;

-- Same for reflections.
create index if not exists idx_reflections_submitted_at_student
  on reflections(submitted_at, student_id)
  where submitted_at is not null;

-- Covering index for the engaged-ever query:
--   SELECT student_id FROM submissions WHERE submitted_at IS NOT NULL
-- The existing partial index is on (program_id), not (student_id).
-- This one enables an index-only scan for the insights page.
create index if not exists idx_submissions_student_submitted
  on submissions(student_id)
  where submitted_at is not null;

-- Same for reflections.
create index if not exists idx_reflections_student_submitted
  on reflections(student_id)
  where submitted_at is not null;
