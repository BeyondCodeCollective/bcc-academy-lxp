-- Per-track automation (Brightspace-style, one shared rules row drives both):
--   auto_certificate — nightly: learners meeting the completion rule get their
--                      certificate issued + emailed, no admin click needed.
--   nudges           — nightly scan emails learners who never started or went
--                      quiet, once per rule per learner.
-- Everything defaults OFF; an admin enables it per course. Service-only access
-- (RLS enabled with no policies), same posture as exam_attempts.

create table if not exists track_automation (
  program_id uuid not null references programs(id) on delete cascade,
  track_slug text not null,
  auto_certificate boolean not null default false,
  -- Completion rule, conditions ANDed:
  --   {"lessons": "all" | <n>, "submissions": <n>}
  -- "all" = every week of the course that has a video; omit submissions to
  -- not require any.
  completion jsonb not null default '{"lessons":"all"}'::jsonb,
  nudges_enabled boolean not null default false,
  -- [{"id":"never-started","afterDays":7},{"id":"stalled","afterDays":14}]
  nudges jsonb not null default '[{"id":"never-started","afterDays":7},{"id":"stalled","afterDays":14}]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (program_id, track_slug)
);

alter table track_automation enable row level security;

-- Send log doubling as the idempotency guard: one nudge per
-- (student, track, rule), ever. Delete a row to allow a re-send.
create table if not exists automation_nudges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null,
  track_slug text not null,
  rule_id text not null,
  sent_at timestamptz not null default now(),
  unique (student_id, track_slug, rule_id)
);

alter table automation_nudges enable row level security;
