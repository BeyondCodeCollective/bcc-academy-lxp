-- Cohort track-scoping + schema flexibility migration.
-- 1. Add track_slug to cohorts — ties a cohort to a specific track within a program.
-- 2. Make start_date nullable — some cohorts (open-enrollment, rolling) have no fixed date.
-- 3. Make total_weeks nullable — same reason; duration is sometimes open-ended.
-- 4. Null out all cohort_id values on students — existing assignments were incorrect;
--    student records are preserved, just the cohort association is cleared.
-- All statements are idempotent (safe to run multiple times).

-- ─── cohorts: add track_slug ────────────────────────────────────────────────
alter table cohorts
  add column if not exists track_slug text;

-- ─── cohorts: make start_date nullable ──────────────────────────────────────
alter table cohorts
  alter column start_date drop not null;

-- ─── cohorts: make total_weeks nullable ─────────────────────────────────────
alter table cohorts
  alter column total_weeks drop not null;

-- ─── students: clear stale cohort assignments ────────────────────────────────
update students
  set cohort_id = null
  where cohort_id is not null;
