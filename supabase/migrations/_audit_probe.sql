-- Migration audit probe.
-- Read-only. Paste into Supabase SQL Editor to see which migrations are applied.
-- Each row checks a signature artifact (table / column / policy / constraint / index / seed row)
-- unique to that migration.

select m.migration,
  case when m.present then 'applied' else 'MISSING' end as status
from (values
  ('attendance.sql',
    to_regclass('public.attendance') is not null),

  ('session_content.sql',
    to_regclass('public.session_content') is not null),

  ('storage_bucket.sql',
    exists(select 1 from storage.buckets where id = 'session-files')),

  ('student_profile_fields.sql',
    exists(select 1 from information_schema.columns
           where table_schema='public' and table_name='students' and column_name='onboarding_completed')),

  ('session_content_s2.sql',
    exists(select 1 from information_schema.columns
           where table_schema='public' and table_name='session_content' and column_name='meeting_link_2')),

  ('session_content_status.sql',
    exists(select 1 from information_schema.columns
           where table_schema='public' and table_name='session_content' and column_name='status')),

  ('programs.sql',
    to_regclass('public.programs') is not null
    and exists(select 1 from information_schema.columns
               where table_schema='public' and table_name='students' and column_name='program_id')),

  ('program_rls.sql',
    exists(select 1 from pg_policies
           where schemaname='public' and tablename='session_content'
             and policyname='Students read own program session content')),

  ('roles.sql',
    to_regclass('public.instructor_tracks') is not null),

  ('session_content_allow_all_tracks.sql',
    not exists(select 1 from information_schema.check_constraints
               where constraint_name='session_content_track_check')),

  ('session_content_overrides.sql',
    exists(select 1 from information_schema.columns
           where table_schema='public' and table_name='session_content' and column_name='title')),

  ('submissions_reflections.sql',
    to_regclass('public.submissions') is not null
    and to_regclass('public.reflections') is not null
    and to_regclass('public.submission_feedback') is not null),

  ('survey_responses.sql',
    to_regclass('public.survey_responses') is not null),

  ('student_tracks.sql',
    to_regclass('public.student_tracks') is not null),

  ('perf_indexes.sql',
    exists(select 1 from pg_indexes
           where schemaname='public' and indexname='idx_submissions_program_id')),

  ('backfill_student_tracks.sql',
    exists(select 1 from student_tracks st
           join programs p on p.id = st.program_id
           where p.slug='atg' and st.track_slug='mass'))
) as m(migration, present)
order by m.migration;
