-- Which scheduled session reminders have gone to which landing-page signup.
-- The (signup_id, kind) primary key is the idempotency gate: the reminder cron
-- inserts the row BEFORE sending, so a racing or repeated run conflicts and
-- skips instead of double-emailing. Service-role only (RLS on, no policies).
create table if not exists signup_reminders (
  signup_id uuid not null references landing_signups(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (signup_id, kind)
);
alter table signup_reminders enable row level security;
