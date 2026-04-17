-- Performance indexes for admin and dashboard hot paths.
-- Every admin tab filters submissions/reflections by program_id, and the
-- dashboard looks up a default cohort by program_id. None of those columns
-- were indexed, so Postgres was doing full scans on each navigation.

create index if not exists idx_submissions_program_id on submissions(program_id);
create index if not exists idx_reflections_program_id on reflections(program_id);
create index if not exists idx_cohorts_program_id on cohorts(program_id);
