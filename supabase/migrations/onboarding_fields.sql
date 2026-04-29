-- Welcome email + onboarding wizard fields
alter table students
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists onboarding_step integer not null default 0,
  add column if not exists welcome_seen_at timestamptz;
