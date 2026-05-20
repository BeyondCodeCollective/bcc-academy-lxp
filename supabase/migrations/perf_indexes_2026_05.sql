-- Performance indexes — May 2026 pass.
-- Idempotent; safe to re-run.

-- attendance had no program_id index at all. The admin engagement tab issues
-- .eq("program_id", ...) against this table on every track tab load, causing
-- a full sequential scan.
create index if not exists idx_attendance_program_id
  on attendance(program_id);

-- student_id for per-student lookups (insights page, engagement scoring).
create index if not exists idx_attendance_student_id
  on attendance(student_id);

-- Composite for the layout's intake-survey redirect check:
--   .eq("student_id", userId).eq("survey_type", BCC_INTAKE_SURVEY_ID)
-- Without this, Postgres picks one single-column index and re-filters on
-- the other — the composite avoids the second pass entirely.
create index if not exists idx_survey_responses_student_type
  on survey_responses(student_id, survey_type);

-- Composite for the batched admin survey query:
--   .eq("program_id", programId).in("survey_type", [...])
create index if not exists idx_survey_responses_program_type
  on survey_responses(program_id, survey_type);

-- Partial indexes for submissions + reflections. Every query against these
-- tables adds WHERE submitted_at IS NOT NULL, so a plain index wastes space
-- on unsubmitted rows. A partial index only covers completed rows — smaller,
-- faster, and preferred by the planner whenever the null filter is present.
create index if not exists idx_submissions_program_submitted
  on submissions(program_id)
  where submitted_at is not null;

create index if not exists idx_reflections_program_submitted
  on reflections(program_id)
  where submitted_at is not null;
