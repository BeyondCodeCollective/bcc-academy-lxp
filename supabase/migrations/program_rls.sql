-- RLS policies for program-level data isolation.
-- Students can only see data belonging to their own program.

-- Enable RLS on programs table (read-only for authenticated)
alter table programs enable row level security;
create policy "Authenticated users can read programs" on programs
  for select using (auth.role() = 'authenticated');

-- Update session_content policy to scope by program
-- Drop existing read policy first (it was just "authenticated can read")
drop policy if exists "Authenticated users can read session content" on session_content;
create policy "Students read own program session content" on session_content
  for select using (
    program_id = (select program_id from students where id = auth.uid())
  );

-- Update attendance policies to scope by program
drop policy if exists "Students read own attendance" on attendance;
create policy "Students read own program attendance" on attendance
  for select using (
    program_id = (select program_id from students where id = auth.uid())
  );

drop policy if exists "Students can check in" on attendance;
create policy "Students check in own program" on attendance
  for insert with check (
    auth.uid() = student_id
    and program_id = (select program_id from students where id = auth.uid())
  );

-- Admin policies already bypass via service role client, so no changes needed there.
