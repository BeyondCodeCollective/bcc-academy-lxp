-- Event management, phase 1: events, registrations (one per parent/guardian),
-- attendees (one per child, each with its own ticket code + cancel token).
-- Registration creates NO student row: attendees are not accounts.
-- All access goes through the service-role client; RLS on with no policies
-- (deny-by-default for anon/authenticated, same as public_survey_responses).
-- Idempotent; safe to re-run.

create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  program_id uuid not null references programs(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/New_York',
  location text,
  join_url text,
  capacity int,
  max_attendees_per_registration int not null default 5,
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, slug)
);

create index if not exists idx_events_program_starts
  on events(program_id, starts_at);

create table if not exists event_registrations (
  id uuid default gen_random_uuid() primary key,
  event_id uuid not null references events(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  parent_first_name text not null,
  parent_last_name text not null,
  parent_email text not null,
  parent_phone text,
  city_state text,
  zip text,
  heard_about text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancel_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists idx_event_registrations_event
  on event_registrations(event_id, status);
create index if not exists idx_event_registrations_email
  on event_registrations(event_id, lower(parent_email));

create table if not exists event_attendees (
  id uuid default gen_random_uuid() primary key,
  registration_id uuid not null references event_registrations(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  grade text,
  school_name text,
  school_type text,
  gender text,
  race_ethnicity text,
  tshirt_size text,
  allergies text,
  emergency_contact_name text,
  emergency_contact_phone text,
  experience_level text,
  eligibility text,
  ticket_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  cancel_token uuid not null default gen_random_uuid() unique,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'waitlisted', 'attended')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  checked_in_at timestamptz
);

create index if not exists idx_event_attendees_event
  on event_attendees(event_id, status);
create index if not exists idx_event_attendees_registration
  on event_attendees(registration_id);

alter table events enable row level security;
alter table event_registrations enable row level security;
alter table event_attendees enable row level security;
