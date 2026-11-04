-- Teaching assistants: an instructor assigned to a course as "assistant" can
-- make every edit a lead instructor can; each edit is logged here and the
-- course's lead instructor(s) get a daily recap (email + Slack) so they can
-- check it matches what they wanted. Existing assignments stay "lead".
alter table instructor_tracks
  add column if not exists role text not null default 'lead';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'instructor_tracks_role_check'
  ) then
    alter table instructor_tracks
      add constraint instructor_tracks_role_check check (role in ('lead', 'assistant'));
  end if;
end $$;

-- One row per TA edit. digested_at is set once the recap has gone out.
-- RLS on with no policy: only server code using the service key reads/writes.
create table if not exists ta_changes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references students(id) on delete cascade,
  track_slug text not null,
  program_id uuid references programs(id),
  action text not null,
  summary text not null,
  created_at timestamptz not null default now(),
  digested_at timestamptz
);
alter table ta_changes enable row level security;
create index if not exists ta_changes_pending_idx
  on ta_changes (created_at) where digested_at is null;
