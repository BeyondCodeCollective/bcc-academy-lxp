-- Per-student notification preferences.
-- One row per student; missing row = opted in to everything (the send helpers
-- treat absence as `true`, so a student only ever has a row once they opt OUT
-- of something). Channel is email-only for now (Resend); push is future work.

create table if not exists notification_preferences (
  student_id uuid primary key references students(id) on delete cascade,
  -- New announcement posted to a track the student is enrolled in.
  announcements boolean not null default true,
  -- Instructor leaves feedback on the student's submission/reflection.
  feedback boolean not null default true,
  updated_at timestamptz default now()
);

-- RLS: a student can read and write only their own preferences row.
-- Service role bypasses RLS for the send-path lookups.
alter table notification_preferences enable row level security;

drop policy if exists "Students can read own notification preferences" on notification_preferences;
create policy "Students can read own notification preferences"
  on notification_preferences for select
  using (auth.uid() = student_id);

drop policy if exists "Students can insert own notification preferences" on notification_preferences;
create policy "Students can insert own notification preferences"
  on notification_preferences for insert
  with check (auth.uid() = student_id);

drop policy if exists "Students can update own notification preferences" on notification_preferences;
create policy "Students can update own notification preferences"
  on notification_preferences for update
  using (auth.uid() = student_id);
