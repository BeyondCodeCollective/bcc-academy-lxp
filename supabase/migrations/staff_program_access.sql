-- Cross-program staff access grants.
--
-- Before this, the ONLY way to give someone access to two programs was to make
-- them super_admin — a platform-wide tier — because access was a single
-- students.program_id stamp. That inflated the super-admin roster with people
-- who just happened to work across two programs (e.g. a managing director who
-- runs Beyond Code Centers AND oversees one Catalyst track).
--
-- A grant is one row per (person, program, optional track): the role they hold
-- IN that program. track_slug null = the whole program; track_slug set = that
-- one course inside it (people, attendance, insights for that track only).
-- students.program_id stays as the account's "home" stamp for everything else.
-- Idempotent; safe to re-run.

create table if not exists staff_program_access (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  role text not null check (role in ('instructor', 'admin')),
  track_slug text,
  granted_by uuid references students(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One grant per person/program/track. The partial index handles the null case,
-- which a plain unique constraint treats as always-distinct (letting the same
-- whole-program grant be inserted twice).
create unique index if not exists staff_program_access_unique_track
  on staff_program_access (student_id, program_id, track_slug)
  where track_slug is not null;

create unique index if not exists staff_program_access_unique_program
  on staff_program_access (student_id, program_id)
  where track_slug is null;

create index if not exists staff_program_access_student
  on staff_program_access (student_id);

alter table staff_program_access enable row level security;

-- No client-side access at all: grants are read and written exclusively by the
-- server with the service client (which bypasses RLS). RLS on with zero
-- policies = deny-all for anon/authenticated, so a compromised session can
-- neither read who holds what nor grant itself a program.
