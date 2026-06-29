-- Daily active-user snapshots, one row per (day, program). Captures the
-- engagement history the platform was NOT recording: until now we only stored
-- each learner's LAST sign-in (students.last_seen_at), so day-by-day actives
-- could never be reconstructed. A daily cron (/api/cron/daily-snapshot) writes
-- one row per program so trends accumulate from here forward.
--
-- Additive + idempotent. Service-client reads only (RLS on, no public policy).

create table if not exists analytics_daily_snapshots (
  id uuid default gen_random_uuid() primary key,
  snapshot_date date not null,
  program_id uuid not null,
  total_accounts integer not null default 0,
  active_1d integer not null default 0,
  active_7d integer not null default 0,
  video_views_total integer not null default 0,
  created_at timestamptz not null default now(),
  unique (snapshot_date, program_id)
);

create index if not exists analytics_daily_snapshots_program_date_idx
  on analytics_daily_snapshots (program_id, snapshot_date);

alter table analytics_daily_snapshots enable row level security;
-- No policy: only the service client (which bypasses RLS) reads/writes this.
