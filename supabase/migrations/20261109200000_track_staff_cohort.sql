-- A staff cohort is a course whose learners ARE staff (e.g. Field Ready Staff
-- Cohort). The usual learner predicate drops is_staff / admin accounts and the
-- Zoom join skips staff-domain emails; on a staff cohort every enrollee counts.
alter table public.track_overrides
  add column if not exists staff_cohort boolean not null default false;

update public.track_overrides
  set staff_cohort = true
  where track_slug = 'field-ready-staff-cohort';
