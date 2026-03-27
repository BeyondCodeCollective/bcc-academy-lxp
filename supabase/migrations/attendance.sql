create table if not exists attendance (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) on delete cascade not null,
  track text not null check (track in ('mass', 'techplus')),
  week_number int not null,
  session_number int not null default 1,
  checked_in_at timestamptz default now(),
  marked_by uuid references students(id),
  unique(student_id, track, week_number, session_number)
);

-- RLS
alter table attendance enable row level security;

-- Students can read their own attendance
create policy "Students read own attendance" on attendance
  for select using (auth.uid() = student_id);

-- Students can check themselves in
create policy "Students can check in" on attendance
  for insert with check (auth.uid() = student_id);

-- Admins can do everything
create policy "Admins full access" on attendance
  for all using (
    exists (select 1 from students where id = auth.uid() and role = 'admin')
  );
