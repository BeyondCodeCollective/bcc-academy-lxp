-- INFERRED BASELINE. NOT THE PRODUCTION SCHEMA.
-- These tables are referenced by supabase/migrations but have no CREATE TABLE there (they were
-- hand-built in the hosted project). Columns below are the minimum needed for the migrations to
-- replay, inferred from the sources noted per column. No policies are created here.
-- Columns that later migrations ADD (calendar_token, is_staff, program_id, ...) are not repeated.

-- students: id = auth.uid() (attendance.sql:20 policies compare auth.uid() = student_id, students.id)
create table students (
  id uuid primary key,                -- src/app/auth/callback/route.ts:439 upsert {id: user.id}
  email text,                         -- callback route.ts:440; students_email_idx.sql; roles.sql:11
  first_name text,                    -- callback route.ts:441
  last_name text,                     -- callback route.ts:442
  role text not null default 'student', -- callback route.ts:443; attendance.sql:27 policy; roles.sql:9 check
  cohort_id uuid,                     -- callback route.ts:445 (FK target unknown; plain uuid here)
  created_at timestamptz default now() -- src select("id, program_id, created_at, last_activity_at")
);

-- RLS on students is enabled here to match production.
alter table students enable row level security;

-- cohorts: cohort_track_scoped.sql alters start_date/total_weeks; src select("id, name, display_name, track_slug, start_date, total_weeks")
create table cohorts (
  id uuid primary key default gen_random_uuid(),
  name text,                          -- src select(...name...)
  display_name text,                  -- src select(...display_name...)
  start_date date not null default current_date, -- cohort_track_scoped.sql:14 drops NOT NULL
  end_date date,                      -- src select("id, name, display_name, start_date, end_date")
  total_weeks int not null default 1, -- cohort_track_scoped.sql:18 drops NOT NULL
  created_at timestamptz default now()
);

-- track_features: program_track_features_survey_enabled.sql adds survey_enabled; src upserts
-- {track_slug, assessment_enabled, updated_at}
create table track_features (
  track_slug text primary key,        -- src upsert onConflict not verified; PK is an assumption
  assessment_enabled boolean not null default false,
  updated_at timestamptz default now()
);

-- sessions: legacy table, only referenced by fk_covering_indexes.sql:17 (index on sessions(cohort_id)).
-- No src usage found by grep (.from("sessions") absent). Columns inferred from that index only.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id)
);
