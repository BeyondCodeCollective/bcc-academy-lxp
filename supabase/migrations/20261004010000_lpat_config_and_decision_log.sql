-- LPAT Track Alignment Layer (configuration) and decision log.
-- Config, not code: every row is scoped to a program (organization) so a new
-- org means new rows, never new code. Archetype keys are plain text on purpose:
-- the Module 1 archetype set (7 vs 9) is still being confirmed with Angel, and
-- a CHECK list here would have to change with it.
-- RLS is on with no policies: only the service client (server code) reads or
-- writes these. Learners never see config, ratings, or the decision log.

-- Verticals (Cybersecurity, IT + Help Desk, AI Fundamentals, ...). is_live marks
-- what the current cohort actually offers.
create table if not exists lpat_verticals (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  slug text not null,
  name text not null,
  is_live boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (program_id, slug)
);

-- Lanes (Placement, Build & Practice, Entrepreneurship).
create table if not exists lpat_lanes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (program_id, slug)
);

-- Roles an archetype connects to. role_type separates tech jobs from jobs that
-- use tech. reviewed_at records instructor / employer partner validation.
create table if not exists lpat_roles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  archetype text not null,
  name text not null,
  role_type text not null check (role_type in ('tech_role', 'tech_enabled_job')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program_id, archetype, name)
);

-- Archetype to vertical alignment, rated rather than hardcoded in pairs.
create table if not exists lpat_archetype_vertical_ratings (
  program_id uuid not null references programs(id) on delete cascade,
  archetype text not null,
  vertical_id uuid not null references lpat_verticals(id) on delete cascade,
  rating text not null check (rating in ('strong', 'good', 'possible')),
  primary key (program_id, archetype, vertical_id)
);

-- Per-org, per-track alignment record, including the time commitment. The
-- beginner / intermediate / advanced label is derived from these numbers in
-- code, not stored, so it cannot drift from them.
create table if not exists lpat_tracks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  track_slug text not null,
  vertical_id uuid references lpat_verticals(id) on delete set null,
  estimated_total_hours int check (estimated_total_hours > 0),
  expected_weekly_study_hours numeric(4, 1) check (expected_weekly_study_hours > 0),
  completion_window_weeks int check (completion_window_weeks > 0),
  prior_exposure_assumed boolean not null default false,
  technical_prerequisites text,
  -- Practice exam readiness checkpoint, in weeks from track start. Null means
  -- use the default: 60 percent of completion_window_weeks.
  practice_exam_checkpoint_week int check (practice_exam_checkpoint_week > 0),
  work_style_demands jsonb not null default '{}',
  pathway_feasibility jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (program_id, track_slug)
);

-- Archetype to track alignment.
create table if not exists lpat_track_archetype_ratings (
  track_id uuid not null references lpat_tracks(id) on delete cascade,
  archetype text not null,
  rating text not null check (rating in ('strong', 'good', 'possible')),
  primary key (track_id, archetype)
);

-- One row per learner per organization. Recommendations are stored as jsonb so
-- the log survives changes to the config tables. The two capacity fields are
-- deliberately separate: seat / operational limits versus the learner's own
-- time capacity.
create table if not exists lpat_decision_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  first_move jsonb,
  system_recommendation jsonb,
  facilitator_recommendation jsonb,
  learner_preference text,
  final_track_slug text,
  final_lane text,
  is_override boolean not null default false,
  override_reason text,
  operational_capacity_constraint text,
  learner_time_capacity_flag text check (learner_time_capacity_flag in (
    'availability_mismatch', 'missed_practice_exam_checkpoint', 'both'
  )),
  confirmed_by uuid references students(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, program_id)
);

create index if not exists idx_lpat_verticals_program on lpat_verticals (program_id);
create index if not exists idx_lpat_lanes_program on lpat_lanes (program_id);
create index if not exists idx_lpat_roles_program on lpat_roles (program_id);
create index if not exists idx_lpat_archetype_vertical_ratings_vertical on lpat_archetype_vertical_ratings (vertical_id);
create index if not exists idx_lpat_tracks_program on lpat_tracks (program_id);
create index if not exists idx_lpat_tracks_vertical on lpat_tracks (vertical_id);
create index if not exists idx_lpat_decision_log_program on lpat_decision_log (program_id);
create index if not exists idx_lpat_decision_log_confirmed_by on lpat_decision_log (confirmed_by);

alter table lpat_verticals enable row level security;
alter table lpat_lanes enable row level security;
alter table lpat_roles enable row level security;
alter table lpat_archetype_vertical_ratings enable row level security;
alter table lpat_tracks enable row level security;
alter table lpat_track_archetype_ratings enable row level security;
alter table lpat_decision_log enable row level security;
