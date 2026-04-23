-- Register the Catalyst program and add a table for anonymous public survey
-- responses. Catalyst's first use case is the public CompTIA Network+ post-
-- survey on catalyst.bccacademy.io — no login required, one response per
-- (program, survey, email). Idempotent; safe to re-run.

insert into programs (slug, name) values
  ('catalyst', 'Catalyst')
on conflict (slug) do nothing;

create table if not exists public_survey_responses (
  id uuid default gen_random_uuid() primary key,
  program_id uuid not null references programs(id) on delete cascade,
  survey_type text not null,
  email text not null,
  full_name text not null,
  responses jsonb not null,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, survey_type, email)
);

create index if not exists idx_public_survey_responses_program
  on public_survey_responses(program_id, survey_type);
