-- supabase/migrations/20260604000000_assessment_tables.sql

-- Program-level feature flags. Controls whether the assessment gate is
-- active for a given program. Toggleable from admin panel with no deploy.
create table if not exists program_features (
  program_slug text primary key,
  assessment_enabled boolean not null default false,
  pre_survey_id  text,
  post_survey_id text,
  mid_survey_id  text,
  updated_at timestamptz not null default now()
);

-- Seed defaults: Catalyst on, everything else off.
insert into program_features (program_slug, assessment_enabled) values
  ('catalyst', true),
  ('atg',      false),
  ('forte',    false),
  ('forge',    false)
on conflict (program_slug) do nothing;

-- Stores a learner's in-progress responses between sessions.
-- Deleted when scoring completes.
create table if not exists assessment_progress (
  student_id uuid primary key references students(id) on delete cascade,
  current_module int not null default 1,
  responses_so_far jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Stores the final scored output for each learner. One row per learner
-- (unique index enforces no retakes without explicit logic).
create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_slug text not null,
  completed_at timestamptz not null default now(),
  raw_responses jsonb not null,
  scored_output jsonb not null,
  facilitator_viewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists assessment_results_student_id_idx
  on assessment_results(student_id);

-- RLS: learners can only read their own result.
alter table assessment_results enable row level security;
alter table assessment_progress enable row level security;
alter table program_features enable row level security;

create policy "learner reads own result"
  on assessment_results for select
  using (auth.uid() = student_id);

create policy "learner reads own progress"
  on assessment_progress for select
  using (auth.uid() = student_id);

create policy "program_features readable by all"
  on program_features for select
  using (true);
