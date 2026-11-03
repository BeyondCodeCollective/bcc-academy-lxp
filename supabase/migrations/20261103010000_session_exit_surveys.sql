-- Per-session exit survey (rating + "what was unclear") and the Monday hours
-- question. One row per learner per session; the hours pop-up and the rating
-- form write different columns of the same row, so understanding is nullable.
-- RLS on with no policy: only server code using the service key reads/writes.
create table if not exists session_exit_surveys (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid references programs(id),
  track_slug text not null,
  week_number int not null,
  session_number int not null,
  understanding smallint check (understanding between 1 and 5),
  unclear_text text,
  hours_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, track_slug, week_number, session_number)
);
alter table session_exit_surveys enable row level security;
create index if not exists session_exit_surveys_track_idx
  on session_exit_surveys (track_slug, week_number, session_number);

-- Per-course opt-in. Off unless an admin turns it on.
alter table track_overrides
  add column if not exists exit_survey_enabled boolean;
