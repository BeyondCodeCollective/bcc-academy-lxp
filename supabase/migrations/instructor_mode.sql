-- Instructor mode: the AI Tutor runs a session as an instructor (hands-on,
-- one step at a time) rather than answering questions. First used by the
-- Forward Deploy (FDE) track; designed for any track. Four pieces:
--
--   1. track_overrides.self_paced — builder-created courses could not be
--      self-paced before (buildTrackFromOverride hardcoded cohort semantics).
--   2. session_lessons — the full lesson body the instructor teaches from,
--      per (track, week). session_content stays learner-facing summary.
--   3. instructor_flags — the office-hours queue. The instructor files a flag
--      when a human should weigh in; a facilitator resolves it.
--   4. human_checkpoints — gates only a human can pass (workflow approval,
--      data sample approval, ship approval, capstone rubric). The AI reads
--      them; it never writes them.
--
-- Idempotent; safe to re-run. Service-role writes throughout.

alter table track_overrides
  add column if not exists self_paced boolean default null;

create table if not exists session_lessons (
  id uuid default gen_random_uuid() primary key,
  program_id uuid not null references programs(id) on delete cascade,
  track text not null,
  week_number int not null check (week_number >= 1),
  body_md text not null,
  -- Where the lesson came from (a repo URL, a doc). Informational.
  source_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (track, week_number)
);
alter table session_lessons enable row level security;
-- Learners never read lessons directly; the instructor route reads them with
-- the service client and teaches from them. No policies.

create table if not exists instructor_flags (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  track_slug text not null,
  week_number int,
  -- Why the instructor stopped and asked for a human. Short, fixed vocabulary
  -- so the facilitator view can group them.
  reason text not null check (reason in (
    'workflow_fit', 'data_rule', 'stuck', 'judgment_call', 'scope', 'other'
  )),
  note text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text
);
create index if not exists idx_instructor_flags_open
  on instructor_flags(program_id, track_slug, status, created_at desc);
create index if not exists idx_instructor_flags_student
  on instructor_flags(student_id, created_at desc);
alter table instructor_flags enable row level security;
create policy "Students read own instructor flags" on instructor_flags
  for select using (auth.uid() = student_id);

create table if not exists human_checkpoints (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  track_slug text not null,
  -- e.g. 'workflow_approved', 'data_sample_approved', 'ship_approved',
  -- 'capstone_scored'. Defined per track in code, not constrained here.
  checkpoint_key text not null,
  approved_by uuid not null references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  note text,
  -- Capstone rubric total, when the checkpoint is a scored one.
  score int,
  unique (student_id, track_slug, checkpoint_key)
);
create index if not exists idx_human_checkpoints_student
  on human_checkpoints(student_id, track_slug);
alter table human_checkpoints enable row level security;
create policy "Students read own checkpoints" on human_checkpoints
  for select using (auth.uid() = student_id);

-- 5. A session the instructor ran to the end. video_watched_at was the only
--    completion signal before; an instructor-mode session has no video.
alter table week_progress
  add column if not exists completed_at timestamptz default null;

-- 6. deployment_notes — the learner's running example as key/value lines
--    (the MY_DEPLOYMENT.md of the course), per track. The instructor writes
--    it; the deployment board renders it.
create table if not exists deployment_notes (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  track_slug text not null,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  unique (student_id, track_slug, key)
);
create index if not exists idx_deployment_notes_student
  on deployment_notes(student_id, track_slug);
alter table deployment_notes enable row level security;
create policy "Students read own deployment notes" on deployment_notes
  for select using (auth.uid() = student_id);

-- 7. The hosted lab is a named, persistent Vercel Sandbox per (learner,
--    track): `fde-<student_id>`. No table needed; the SDK resumes it by name.
