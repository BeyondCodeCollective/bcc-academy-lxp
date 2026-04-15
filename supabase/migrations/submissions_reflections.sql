-- Submissions & Reflections tables
-- Students submit project work and weekly reflections per track/week.
-- Instructors review and leave feedback from the admin panel.

-- 1. Submissions table
create table if not exists submissions (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  track_slug text not null,
  week_number int not null,
  description text,
  links jsonb default '[]'::jsonb,
  files jsonb default '[]'::jsonb,
  submitted_at timestamptz,
  program_id uuid not null references programs(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, track_slug, week_number)
);

-- 2. Reflections table
create table if not exists reflections (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  track_slug text not null,
  week_number int not null,
  responses jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  program_id uuid not null references programs(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, track_slug, week_number)
);

-- 3. Submission feedback table (shared for both submissions and reflections)
create table if not exists submission_feedback (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references submissions(id) on delete cascade,
  reflection_id uuid references reflections(id) on delete cascade,
  reviewer_id uuid not null references students(id),
  comment text not null,
  created_at timestamptz default now(),
  constraint feedback_target_check check (
    (submission_id is not null and reflection_id is null) or
    (submission_id is null and reflection_id is not null)
  )
);

-- 4. RLS policies

-- Submissions: students can read/write their own
alter table submissions enable row level security;

create policy "Students can read own submissions"
  on submissions for select
  using (auth.uid() = student_id);

create policy "Students can insert own submissions"
  on submissions for insert
  with check (auth.uid() = student_id);

create policy "Students can update own submissions"
  on submissions for update
  using (auth.uid() = student_id);

-- Reflections: students can read/write their own
alter table reflections enable row level security;

create policy "Students can read own reflections"
  on reflections for select
  using (auth.uid() = student_id);

create policy "Students can insert own reflections"
  on reflections for insert
  with check (auth.uid() = student_id);

create policy "Students can update own reflections"
  on reflections for update
  using (auth.uid() = student_id);

-- Feedback: students can read feedback on their own submissions/reflections
alter table submission_feedback enable row level security;

create policy "Students can read feedback on own work"
  on submission_feedback for select
  using (
    exists (
      select 1 from submissions s where s.id = submission_id and s.student_id = auth.uid()
    )
    or exists (
      select 1 from reflections r where r.id = reflection_id and r.student_id = auth.uid()
    )
  );
