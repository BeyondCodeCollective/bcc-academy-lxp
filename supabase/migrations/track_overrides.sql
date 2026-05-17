-- Track-level overrides. The TS configs in src/lib/programs/*.ts remain the
-- source of truth for track structure (which tracks exist, type, gates, full
-- weeks[] content). This table lets non-engineer admins override the
-- presentational metadata that renders on /dashboard/track/[slug] (name,
-- instructor, description, dates, weekSummaries, schedule) without a deploy.
--
-- Override semantics mirror session_content_overrides.sql: NULL in DB =
-- "use TS config default". Non-null wins.

create table if not exists track_overrides (
  id uuid default gen_random_uuid() primary key,
  program_id uuid not null references programs(id),
  track_slug text not null,

  -- Overridable fields. NULL = use TS config default.
  name text,
  short_name text,
  description text,
  instructor text,
  start_date date,
  total_weeks int check (total_weeks is null or (total_weeks >= 1 and total_weeks <= 52)),
  sessions_per_week int check (sessions_per_week is null or (sessions_per_week >= 1 and sessions_per_week <= 7)),
  last_session_day_offset int check (last_session_day_offset is null or (last_session_day_offset >= 0 and last_session_day_offset <= 6)),
  session_times jsonb,             -- string[]
  week_summaries jsonb,            -- { week: int, topic: string, icon: string }[]
  default_reflection_prompts jsonb, -- string[]
  submissions_enabled boolean,
  reflections_enabled boolean,

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(program_id, track_slug)
);

create index if not exists track_overrides_program_idx on track_overrides(program_id);

alter table track_overrides enable row level security;

create policy "Authenticated users can read track overrides" on track_overrides
  for select using (auth.role() = 'authenticated');

-- Writes go through createServiceClient() (service role bypasses RLS).
