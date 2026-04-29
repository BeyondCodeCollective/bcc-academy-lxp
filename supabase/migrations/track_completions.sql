-- Track completion records + certificates
create table if not exists track_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id),
  track_slug text not null,
  program_id uuid not null references programs(id),
  completed_at timestamptz not null default now(),
  certificate_id uuid not null default gen_random_uuid(),
  unique(student_id, track_slug, program_id)
);

create index idx_track_completions_certificate on track_completions (certificate_id);

alter table track_completions enable row level security;

create policy "Students can view own completions"
  on track_completions for select
  using (student_id = auth.uid());

create policy "Admins can manage completions"
  on track_completions for all
  using (
    exists (
      select 1 from students
      where students.id = auth.uid()
        and students.role in ('admin', 'super_admin')
    )
  );

-- Public read for certificate pages (by certificate_id)
create policy "Anyone can view certificates by ID"
  on track_completions for select
  using (true);
