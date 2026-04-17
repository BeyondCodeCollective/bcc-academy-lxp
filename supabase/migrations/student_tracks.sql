-- Student track enrollment junction table
-- Links students to specific tracks within a program.
-- Students see only the tracks they're explicitly enrolled in.
-- Admins bypass this filter in application code.

create table if not exists student_tracks (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  track_slug text not null,
  program_id uuid not null references programs(id),
  created_at timestamptz default now(),
  unique (student_id, track_slug, program_id)
);

-- Index for fast lookups by student
create index if not exists idx_student_tracks_student_id on student_tracks(student_id);

-- Index for admin queries by program
create index if not exists idx_student_tracks_program_id on student_tracks(program_id);

-- RLS: students can read their own track assignments
alter table student_tracks enable row level security;

create policy "Students can read own track assignments"
  on student_tracks for select
  using (auth.uid() = student_id);

-- Service role bypasses RLS for admin operations (insert/update/delete)
