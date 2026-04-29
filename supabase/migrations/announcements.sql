-- Instructor announcements shown as banners on the student dashboard
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id),
  track_slug text,
  instructor_id uuid not null references students(id),
  message text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idx_announcements_program_active
  on announcements (program_id, expires_at)
  where expires_at > now();

alter table announcements enable row level security;

create policy "Admins and instructors can manage announcements"
  on announcements for all
  using (
    exists (
      select 1 from students
      where students.id = auth.uid()
        and students.role in ('instructor', 'admin', 'super_admin')
    )
  );

create policy "Students can read active announcements"
  on announcements for select
  using (expires_at > now());
