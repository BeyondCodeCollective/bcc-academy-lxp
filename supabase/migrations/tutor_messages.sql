-- Log every tutor exchange. Two purposes:
--   1. Rate-limiting — count today's rows for a student and cap.
--   2. Usage visibility — answer "is anyone using the tutor" without
--      parsing Vercel logs.
-- Idempotent; safe to re-run.

create table if not exists tutor_messages (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  track_slug text,
  week_number integer,
  input_tokens integer,
  output_tokens integer,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tutor_messages_student_created
  on tutor_messages(student_id, created_at desc);

create index if not exists idx_tutor_messages_program_created
  on tutor_messages(program_id, created_at desc);

alter table tutor_messages enable row level security;
-- No policies: service client writes + reads. Leaving the anon role out
-- means leaked keys can't read student usage history.
