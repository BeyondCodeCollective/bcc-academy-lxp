-- Survey responses table
-- Stores pre-survey, post-survey, and any future survey data as JSONB.
-- Each student can have one response per survey_type.

create table if not exists survey_responses (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  survey_type text not null,
  responses jsonb not null default '{}',
  completed_at timestamptz,
  program_id uuid not null references programs(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, survey_type)
);

-- Index for fast lookups
create index if not exists idx_survey_responses_student on survey_responses(student_id);
create index if not exists idx_survey_responses_program on survey_responses(program_id);
create index if not exists idx_survey_responses_type on survey_responses(survey_type);

-- RLS
alter table survey_responses enable row level security;

create policy "Students can read own survey responses"
  on survey_responses for select
  using (auth.uid() = student_id);

create policy "Students can insert own survey responses"
  on survey_responses for insert
  with check (auth.uid() = student_id);

create policy "Students can update own survey responses"
  on survey_responses for update
  using (auth.uid() = student_id);
