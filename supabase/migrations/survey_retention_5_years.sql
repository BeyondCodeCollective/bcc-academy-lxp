-- Raise retention for public_survey_responses from 3 → 5 years to match
-- the new End-of-Cohort survey consent text. New rows get the 5-year
-- horizon via the default. Existing rows keep their original deletion
-- date (set at insert time in the app) unless we explicitly update them.
--
-- Idempotent; safe to re-run.

alter table public_survey_responses
  alter column scheduled_deletion_at
    set default (now() + interval '5 years');
