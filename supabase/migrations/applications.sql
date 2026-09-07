-- Applications become their own entity — the third leg of a cohort launch
-- (landing page → application → course). Previously each application was a
-- bespoke coded page (/apply/sbft etc.) saving into public_survey_responses;
-- now an application is a DB row rendered by one generic /apply/[slug]
-- template, and its submissions carry a real review state instead of living
-- as survey answers.
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  program_id   uuid references public.programs(id),
  -- The cohort this application feeds. Accepting a submission allowlists the
  -- applicant for this track.
  track_slug   text,
  title        text not null,
  description  text,
  -- SurveyQuestion[] (src/components/survey-fields.tsx) — same shape the
  -- survey renderer already knows how to draw and validate.
  questions    jsonb not null default '[]'::jsonb,
  open         boolean not null default true,
  closes_at    timestamptz,
  -- Who hears about each submission (defaults to APPLICATION_NOTIFY_EMAIL).
  notify_email text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.application_submissions (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  email          text not null,
  full_name      text,
  answers        jsonb not null default '{}'::jsonb,
  -- new | accepted | declined | waitlisted
  status         text not null default 'new',
  reviewed_by    text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  -- One application per person per cohort; a resubmit updates the answers.
  unique (application_id, email)
);

-- All reads and writes go through server actions on the service client.
alter table public.applications enable row level security;
alter table public.application_submissions enable row level security;
