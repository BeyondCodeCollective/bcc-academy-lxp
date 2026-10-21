-- Per-event custom parent survey. survey_questions is null for the default
-- four questions; otherwise an array of {prompt, type, options?}. Custom
-- responses keep a snapshot of {prompt, type, value} in answers so later
-- edits to the questions never reshape old data. Idempotent; safe to re-run.
alter table events
  add column if not exists survey_questions jsonb;

alter table event_survey_responses
  add column if not exists answers jsonb,
  alter column rating drop not null;
