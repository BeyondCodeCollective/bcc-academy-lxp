-- Catch-up migration.
-- Consolidates every file in supabase/migrations/ into a single idempotent block.
-- Safe to run on any DB state — applied statements become no-ops, missing ones get applied.
-- Run in Supabase SQL Editor (service role). Use _audit_probe.sql first to see what's missing.

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Base tables (no program_id yet)
-- ════════════════════════════════════════════════════════════════════════

-- attendance.sql
create table if not exists attendance (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) on delete cascade not null,
  track text not null,
  week_number int not null,
  session_number int not null default 1,
  checked_in_at timestamptz default now(),
  marked_by uuid references students(id),
  unique(student_id, track, week_number, session_number)
);
alter table attendance enable row level security;

-- session_content.sql
create table if not exists session_content (
  id uuid default gen_random_uuid() primary key,
  track text not null,
  week_number int not null check (week_number >= 1),
  meeting_link text,
  recording_url text,
  resources jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(track, week_number)
);
alter table session_content enable row level security;

-- student_profile_fields.sql
alter table students
  add column if not exists location text,
  add column if not exists date_of_birth date,
  add column if not exists education_level text,
  add column if not exists onboarding_completed boolean not null default false;

-- session_content_s2.sql
alter table session_content
  add column if not exists meeting_link_2 text,
  add column if not exists recording_url_2 text;

-- session_content_status.sql
alter table session_content
  add column if not exists status text not null default 'upcoming',
  add column if not exists status_2 text not null default 'upcoming';

-- session_content_overrides.sql
alter table session_content
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists description text,
  add column if not exists objectives jsonb;

-- session_content_allow_all_tracks.sql (drop legacy CHECK that blocked Forge tracks)
alter table session_content drop constraint if exists session_content_track_check;
alter table attendance drop constraint if exists attendance_track_check;

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 2 — Programs (white-label tenant column)
-- ════════════════════════════════════════════════════════════════════════

-- programs.sql
create table if not exists programs (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  created_at timestamptz default now()
);

insert into programs (slug, name) values
  ('atg', 'After The Game'),
  ('forge', 'The Forge'),
  ('catalyst', 'Catalyst')
on conflict (slug) do nothing;

alter table students        add column if not exists program_id uuid references programs(id);
alter table cohorts         add column if not exists program_id uuid references programs(id);
alter table session_content add column if not exists program_id uuid references programs(id);
alter table attendance      add column if not exists program_id uuid references programs(id);

update students        set program_id = (select id from programs where slug='atg') where program_id is null;
update cohorts         set program_id = (select id from programs where slug='atg') where program_id is null;
update session_content set program_id = (select id from programs where slug='atg') where program_id is null;
update attendance      set program_id = (select id from programs where slug='atg') where program_id is null;

alter table students        alter column program_id set not null;
alter table cohorts         alter column program_id set not null;
alter table session_content alter column program_id set not null;
alter table attendance      alter column program_id set not null;

-- Swap unique constraints to include program_id
alter table session_content drop constraint if exists session_content_track_week_number_key;
alter table session_content drop constraint if exists session_content_program_track_week_key;
alter table session_content add  constraint session_content_program_track_week_key
  unique (program_id, track, week_number);

alter table attendance drop constraint if exists attendance_student_id_track_week_number_session_number_key;
alter table attendance drop constraint if exists attendance_program_student_track_week_session_key;
alter table attendance add  constraint attendance_program_student_track_week_session_key
  unique (program_id, student_id, track, week_number, session_number);

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 3 — Roles
-- ════════════════════════════════════════════════════════════════════════

-- roles.sql
alter table students drop constraint if exists students_role_check;
alter table students add  constraint students_role_check
  check (role in ('student', 'instructor', 'admin', 'super_admin'));

update students set role = 'super_admin'
  where email in ('fonz.morris@wearebgc.org', 'admin@wearebgc.org')
    and role <> 'super_admin';

update students set role = 'instructor'
  where email = 'kkjoyner@gmail.com' and role = 'admin';

create table if not exists instructor_tracks (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  track_slug text not null,
  program_id uuid not null references programs(id),
  created_at timestamptz default now(),
  unique(student_id, track_slug, program_id)
);
alter table instructor_tracks enable row level security;

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 4 — Submissions / Reflections / Surveys / Student Tracks
-- ════════════════════════════════════════════════════════════════════════

-- submissions_reflections.sql
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
alter table submissions enable row level security;

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
alter table reflections enable row level security;

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
alter table submission_feedback enable row level security;

-- survey_responses.sql
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
alter table survey_responses enable row level security;

create index if not exists idx_survey_responses_student on survey_responses(student_id);
create index if not exists idx_survey_responses_program on survey_responses(program_id);
create index if not exists idx_survey_responses_type    on survey_responses(survey_type);

-- student_tracks.sql
create table if not exists student_tracks (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  track_slug text not null,
  program_id uuid not null references programs(id),
  created_at timestamptz default now(),
  unique (student_id, track_slug, program_id)
);
alter table student_tracks enable row level security;

create index if not exists idx_student_tracks_student_id on student_tracks(student_id);
create index if not exists idx_student_tracks_program_id on student_tracks(program_id);

-- perf_indexes.sql
create index if not exists idx_submissions_program_id on submissions(program_id);
create index if not exists idx_reflections_program_id on reflections(program_id);
create index if not exists idx_cohorts_program_id     on cohorts(program_id);

-- perf_indexes_students.sql
create index if not exists idx_students_program_id on students(program_id);
create index if not exists idx_programs_slug      on programs(slug);

-- perf_indexes_admin.sql
create index if not exists idx_instructor_tracks_program_id on instructor_tracks(program_id);
create index if not exists idx_instructor_tracks_student_id on instructor_tracks(student_id);

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 5 — Storage bucket
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('session-files', 'session-files', true)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 6 — RLS policies (drop-then-create for idempotency)
-- ════════════════════════════════════════════════════════════════════════

-- programs
drop policy if exists "Authenticated users can read programs" on programs;
alter table programs enable row level security;
create policy "Authenticated users can read programs" on programs
  for select using (auth.role() = 'authenticated');

-- session_content: program-scoped read
drop policy if exists "Authenticated users can read session content" on session_content;
drop policy if exists "Students read own program session content"     on session_content;
create policy "Students read own program session content" on session_content
  for select using (
    program_id = (select program_id from students where id = auth.uid())
  );

-- attendance
drop policy if exists "Students read own attendance"          on attendance;
drop policy if exists "Students read own program attendance"  on attendance;
create policy "Students read own program attendance" on attendance
  for select using (
    program_id = (select program_id from students where id = auth.uid())
  );

drop policy if exists "Students can check in"          on attendance;
drop policy if exists "Students check in own program"  on attendance;
create policy "Students check in own program" on attendance
  for insert with check (
    auth.uid() = student_id
    and program_id = (select program_id from students where id = auth.uid())
  );

drop policy if exists "Admins full access"             on attendance;
drop policy if exists "Privileged roles full access"   on attendance;
create policy "Privileged roles full access" on attendance
  for all using (
    exists (select 1 from students
            where id = auth.uid()
              and role in ('admin', 'super_admin', 'instructor'))
  );

-- instructor_tracks
drop policy if exists "Admins manage instructor tracks" on instructor_tracks;
create policy "Admins manage instructor tracks" on instructor_tracks
  for all using (
    exists (select 1 from students
            where id = auth.uid()
              and role in ('admin', 'super_admin'))
  );

drop policy if exists "Instructors read own tracks" on instructor_tracks;
create policy "Instructors read own tracks" on instructor_tracks
  for select using (auth.uid() = student_id);

-- submissions
drop policy if exists "Students can read own submissions"   on submissions;
create policy "Students can read own submissions" on submissions
  for select using (auth.uid() = student_id);

drop policy if exists "Students can insert own submissions" on submissions;
create policy "Students can insert own submissions" on submissions
  for insert with check (auth.uid() = student_id);

drop policy if exists "Students can update own submissions" on submissions;
create policy "Students can update own submissions" on submissions
  for update using (auth.uid() = student_id);

-- reflections
drop policy if exists "Students can read own reflections"   on reflections;
create policy "Students can read own reflections" on reflections
  for select using (auth.uid() = student_id);

drop policy if exists "Students can insert own reflections" on reflections;
create policy "Students can insert own reflections" on reflections
  for insert with check (auth.uid() = student_id);

drop policy if exists "Students can update own reflections" on reflections;
create policy "Students can update own reflections" on reflections
  for update using (auth.uid() = student_id);

-- submission_feedback
drop policy if exists "Students can read feedback on own work" on submission_feedback;
create policy "Students can read feedback on own work" on submission_feedback
  for select using (
    exists (select 1 from submissions  s where s.id = submission_id and s.student_id = auth.uid())
    or
    exists (select 1 from reflections  r where r.id = reflection_id and r.student_id = auth.uid())
  );

-- survey_responses
drop policy if exists "Students can read own survey responses"   on survey_responses;
create policy "Students can read own survey responses" on survey_responses
  for select using (auth.uid() = student_id);

drop policy if exists "Students can insert own survey responses" on survey_responses;
create policy "Students can insert own survey responses" on survey_responses
  for insert with check (auth.uid() = student_id);

drop policy if exists "Students can update own survey responses" on survey_responses;
create policy "Students can update own survey responses" on survey_responses
  for update using (auth.uid() = student_id);

-- student_tracks
drop policy if exists "Students can read own track assignments" on student_tracks;
create policy "Students can read own track assignments" on student_tracks
  for select using (auth.uid() = student_id);

-- storage bucket policies (on storage.objects)
drop policy if exists "Anyone can read session files"           on storage.objects;
create policy "Anyone can read session files"
  on storage.objects for select to public
  using (bucket_id = 'session-files');

drop policy if exists "Authenticated can upload session files"  on storage.objects;
create policy "Authenticated can upload session files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'session-files');

drop policy if exists "Authenticated can delete session files"  on storage.objects;
create policy "Authenticated can delete session files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'session-files');

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 7 — Backfills (idempotent via ON CONFLICT)
-- ════════════════════════════════════════════════════════════════════════

-- backfill_student_tracks.sql: ATG students → mass + techplus
with atg as (select id from programs where slug = 'atg')
insert into student_tracks (student_id, track_slug, program_id)
select s.id, t.slug, atg.id
from students s
cross join atg
cross join (values ('mass'), ('techplus')) as t(slug)
where s.program_id = atg.id
on conflict (student_id, track_slug, program_id) do nothing;

-- youngfonz@gmail.com → ai-fundamentals on Forge
with forge as (select id from programs where slug = 'forge')
insert into student_tracks (student_id, track_slug, program_id)
select s.id, 'ai-fundamentals', forge.id
from students s
cross join forge
where lower(s.email) = 'youngfonz@gmail.com'
  and s.program_id = forge.id
on conflict (student_id, track_slug, program_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 8 — Public (unauthenticated) survey responses
-- ════════════════════════════════════════════════════════════════════════

-- public_survey_responses.sql: anonymous submissions from public subdomains
-- (currently catalyst.bccacademy.io → CompTIA Network+ post-survey).
create table if not exists public_survey_responses (
  id uuid default gen_random_uuid() primary key,
  program_id uuid not null references programs(id) on delete cascade,
  survey_type text not null,
  email text not null,
  full_name text not null,
  responses jsonb not null,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, survey_type, email)
);

create index if not exists idx_public_survey_responses_program
  on public_survey_responses(program_id, survey_type);

-- ════════════════════════════════════════════════════════════════════════
-- SECTION 9 — Survey privacy hardening
-- ════════════════════════════════════════════════════════════════════════

-- survey_privacy_hardening.sql: consent tracking + retention horizon +
-- withdrawal marker on public_survey_responses; RLS; admin_access_log.

alter table public_survey_responses
  add column if not exists consent_version text;
alter table public_survey_responses
  add column if not exists consent_at timestamptz;
alter table public_survey_responses
  add column if not exists scheduled_deletion_at timestamptz;
alter table public_survey_responses
  add column if not exists withdrawn_at timestamptz;

update public_survey_responses
set consent_version = coalesce(consent_version, 'v0'),
    consent_at = coalesce(consent_at, completed_at),
    scheduled_deletion_at = coalesce(
      scheduled_deletion_at,
      completed_at + interval '3 years'
    );

alter table public_survey_responses
  alter column consent_version set not null,
  alter column consent_version set default 'v1',
  alter column consent_at set not null,
  alter column consent_at set default now(),
  alter column scheduled_deletion_at set not null,
  alter column scheduled_deletion_at set default (now() + interval '3 years');

create index if not exists idx_public_survey_responses_deletion
  on public_survey_responses(scheduled_deletion_at)
  where withdrawn_at is null;

alter table public_survey_responses enable row level security;

create table if not exists admin_access_log (
  id uuid default gen_random_uuid() primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  program_id uuid references programs(id) on delete set null,
  action text not null,
  resource text not null,
  row_count integer,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_access_log_actor
  on admin_access_log(actor_user_id, created_at desc);
create index if not exists idx_admin_access_log_resource
  on admin_access_log(resource, created_at desc);

alter table admin_access_log enable row level security;
