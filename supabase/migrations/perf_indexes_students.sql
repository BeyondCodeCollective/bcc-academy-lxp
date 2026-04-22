-- Indexes that speed up the magic-link → dashboard hot path.
-- Idempotent; safe to re-run.

-- RLS policies across cohorts, session_content, attendance do
-- `(select program_id from students where id = auth.uid())`.
-- Without this index, that subquery scans students on every evaluation.
create index if not exists idx_students_program_id on students(program_id);

-- Used on every auth callback to resolve the current hostname's program.
-- The UNIQUE constraint already covers lookups, but an explicit btree index
-- is cheap insurance and makes the query plan stable.
create index if not exists idx_programs_slug on programs(slug);
