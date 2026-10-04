-- LPAT entry flow: persona intake (Catalyst record) and confidence baseline
-- (LPAT record). Two tables, joined only by student_id (the shared learner_id).
-- Nothing here is scored and nothing gates the assessment.

create table if not exists catalyst_intake (
  student_id uuid primary key references students(id) on delete cascade,
  program_slug text not null,
  career_stage text not null check (career_stage in (
    'first_job_or_direction', 'outside_tech_moving_in', 'between_jobs_or_returning', 'in_tech_growing'
  )),
  digital_comfort text not null check (digital_comfort in (
    'new', 'get_by', 'comfortable', 'very_comfortable'
  )),
  tech_exposure text not null check (tech_exposure in (
    'not_yet', 'a_little', 'some', 'technical_role'
  )),
  created_at timestamptz not null default now()
);

-- Entry and exit snapshots are separate rows so the exit never overwrites the
-- baseline. Values are integers 1 to 4 so a later scale change keeps history.
create table if not exists lpat_confidence (
  student_id uuid not null references students(id) on delete cascade,
  phase text not null check (phase in ('entry', 'exit')),
  training smallint not null check (training between 1 and 4),
  job smallint not null check (job between 1 and 4),
  captured_at timestamptz not null default now(),
  primary key (student_id, phase)
);

alter table catalyst_intake enable row level security;
alter table lpat_confidence enable row level security;

create policy "learner reads own intake"
  on catalyst_intake for select
  using (auth.uid() = student_id);

create policy "learner reads own confidence"
  on lpat_confidence for select
  using (auth.uid() = student_id);
