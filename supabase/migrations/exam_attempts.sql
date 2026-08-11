-- Practice-exam attempts. Unlimited retakes = one row per attempt; the admin
-- view derives best/latest per student. All access goes through server actions
-- with the service client, so RLS is enabled with no policies (deny-all to
-- anon/authenticated), same posture as other server-managed tables.
create table if not exists exam_attempts (
  id uuid default gen_random_uuid() primary key,
  exam_id text not null,
  student_id uuid not null references students(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb,
  score integer,
  total integer,
  domain_scores jsonb
);

create index if not exists idx_exam_attempts_exam_student
  on exam_attempts(exam_id, student_id);

alter table exam_attempts enable row level security;
