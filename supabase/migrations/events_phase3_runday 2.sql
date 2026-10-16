-- Event management, phase 3: run day. Check-in audit, day-before reminder,
-- and a short post-event survey per family, tagged to the event.
-- Idempotent; safe to re-run.

-- Who marked the attendee as attended (checked_in_at already exists).
alter table event_attendees
  add column if not exists checked_in_by uuid references students(id);

-- One reminder and one survey invite per registration; the survey link is
-- keyed by its own token so a parent never needs an account.
alter table event_registrations
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists survey_sent_at timestamptz,
  add column if not exists survey_token uuid not null default gen_random_uuid() unique;

-- One response per registration (a family answers once; resubmitting edits).
create table if not exists event_survey_responses (
  id uuid default gen_random_uuid() primary key,
  event_id uuid not null references events(id) on delete cascade,
  registration_id uuid not null references event_registrations(id) on delete cascade unique,
  rating smallint not null check (rating between 1 and 5),
  would_recommend boolean,
  enjoyed text,
  improve text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_survey_responses_event
  on event_survey_responses(event_id);

-- The comms cron scans upcoming and recently ended open events.
create index if not exists idx_events_open_starts
  on events(starts_at) where status = 'open';

alter table event_survey_responses enable row level security;
