-- Roles migration: add super_admin and instructor roles
-- super_admin: cross-program access (Fonz)
-- instructor: scoped to assigned tracks within their program
-- admin: full access within their program (unchanged behavior)
-- student: unchanged

-- 1. Update role check constraint to allow new roles
alter table students drop constraint if exists students_role_check;
alter table students add constraint students_role_check
  check (role in ('student', 'instructor', 'admin', 'super_admin'));

-- 2. Set super admin accounts
update students
  set role = 'super_admin'
  where email in ('fonz.morris@wearebgc.org', 'admin@wearebgc.org');

-- 3. Update known instructors to instructor role
update students
  set role = 'instructor'
  where email = 'kkjoyner@gmail.com'
    and role = 'admin';

-- 4. Update RLS policies to recognize new roles

-- Attendance: update admin policy to include super_admin and instructor
drop policy if exists "Admins full access" on attendance;
create policy "Privileged roles full access" on attendance
  for all using (
    exists (
      select 1 from students
      where id = auth.uid()
        and role in ('admin', 'super_admin', 'instructor')
    )
  );

-- 5. Add instructor_tracks table to scope instructors to specific tracks
create table if not exists instructor_tracks (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  track_slug text not null,
  program_id uuid not null references programs(id),
  created_at timestamptz default now(),
  unique(student_id, track_slug, program_id)
);

alter table instructor_tracks enable row level security;

-- Only admins/super_admins can manage instructor assignments
create policy "Admins manage instructor tracks" on instructor_tracks
  for all using (
    exists (
      select 1 from students
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

-- Instructors can read their own assignments
create policy "Instructors read own tracks" on instructor_tracks
  for select using (auth.uid() = student_id);
