-- Rich per-user activity events — the timeline the platform never recorded.
-- Until now liveness was inferred from attendance / submissions / reflections /
-- video-watches; there was no record of logins, page views, or in-video
-- progress, so "what did this learner actually do?" couldn't be answered.
-- This append-only event log fills that gap going forward.
--
-- Additive + idempotent. Service-client writes only (RLS on, no public policy);
-- the ingest route (/api/events) and server hooks use the service client.

create table if not exists activity_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid,
  track_slug text,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_program_created_idx
  on activity_events (program_id, created_at);
create index if not exists activity_events_user_created_idx
  on activity_events (user_id, created_at);
create index if not exists activity_events_type_created_idx
  on activity_events (event_type, created_at);

alter table activity_events enable row level security;
-- No policy: only the service client (which bypasses RLS) reads/writes this.
