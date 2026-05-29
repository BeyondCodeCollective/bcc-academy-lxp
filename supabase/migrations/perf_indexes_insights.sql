-- Performance indexes for Insights page analytics queries (June 2026)
-- Idempotent; safe to re-run.

-- Covering index for active-7d attendance query: makes it index-only scan
-- Query: SELECT student_id FROM attendance WHERE checked_in_at >= '...'
create index if not exists idx_attendance_active_7d
  on attendance(checked_in_at, student_id);

-- Covering index for active-7d submissions query
-- Query: SELECT student_id FROM submissions WHERE submitted_at IS NOT NULL AND submitted_at >= '...'
create index if not exists idx_submissions_active_7d
  on submissions(submitted_at, student_id)
  where submitted_at is not null;

-- Covering index for active-7d reflections query
-- Query: SELECT student_id FROM reflections WHERE submitted_at IS NOT NULL AND submitted_at >= '...'
create index if not exists idx_reflections_active_7d
  on reflections(submitted_at, student_id)
  where submitted_at is not null;

-- Covering index for engaged-ever submissions query (full table scan, index-only)
-- Query: SELECT student_id FROM submissions WHERE submitted_at IS NOT NULL
create index if not exists idx_submissions_engaged_ever
  on submissions(student_id)
  where submitted_at is not null;

-- Covering index for engaged-ever reflections query (full table scan, index-only)
-- Query: SELECT student_id FROM reflections WHERE submitted_at IS NOT NULL
create index if not exists idx_reflections_engaged_ever
  on reflections(student_id)
  where submitted_at is not null;
