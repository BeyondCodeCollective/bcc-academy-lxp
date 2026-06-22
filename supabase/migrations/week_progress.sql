-- Self-paced progress: one row per (learner, track, week) recording when the
-- week's video was watched. Powers the admin Students → Progress grid.
--
-- NOTE: this table already exists in production (it was created out-of-band via
-- the Management API, never committed as a migration). This file backfills that
-- gap so a fresh database rebuild matches prod. It mirrors the live schema
-- exactly — including program_id WITHOUT a foreign key, as prod has it.
-- Idempotent; safe to re-run.

create table if not exists week_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null,
  track_slug text not null,
  week_number integer not null,
  video_watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track_slug, week_number)
);

alter table week_progress enable row level security;

-- Learners read/write only their own progress rows; server-side reads use the
-- service client, which bypasses RLS.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'week_progress'
      and policyname = 'students_own_progress'
  ) then
    create policy students_own_progress on week_progress
      for all using (auth.uid() = user_id);
  end if;
end $$;
