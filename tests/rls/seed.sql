-- Synthetic seed. Runs as the superuser (bypasses RLS). All identities are fake @example.test.
-- Program A: S1, S2 (students), I1 (instructor), AD1 (admin). Program B: S3 (student), AD2 (admin).
\set ON_ERROR_STOP on
begin;
insert into programs (id, slug, name) values
  ('a0000000-0000-0000-0000-00000000000a', 'prog-a', 'Program A'),
  ('b0000000-0000-0000-0000-00000000000b', 'prog-b', 'Program B');

insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 's1@example.test'),
  ('11111111-0000-0000-0000-000000000002', 's2@example.test'),
  ('11111111-0000-0000-0000-000000000003', 's3@example.test'),
  ('11111111-0000-0000-0000-0000000000a1', 'i1@example.test'),
  ('11111111-0000-0000-0000-0000000000d1', 'ad1@example.test'),
  ('11111111-0000-0000-0000-0000000000d2', 'ad2@example.test');

insert into students (id, email, first_name, last_name, role, program_id, is_staff, date_of_birth, zip, location) values
  ('11111111-0000-0000-0000-000000000001', 's1@example.test', 'Sam',  'One',   'student',    'a0000000-0000-0000-0000-00000000000a', false, '2008-01-01', '30301', 'Atlanta'),
  ('11111111-0000-0000-0000-000000000002', 's2@example.test', 'Sue',  'Two',   'student',    'a0000000-0000-0000-0000-00000000000a', false, '2008-02-02', '30302', 'Atlanta'),
  ('11111111-0000-0000-0000-000000000003', 's3@example.test', 'Stan', 'Three', 'student',    'b0000000-0000-0000-0000-00000000000b', false, '2008-03-03', '10001', 'New York'),
  ('11111111-0000-0000-0000-0000000000a1', 'i1@example.test', 'Ida',  'Inst',  'instructor', 'a0000000-0000-0000-0000-00000000000a', true,  null, null, null),
  ('11111111-0000-0000-0000-0000000000d1', 'ad1@example.test','Al',   'AdminA','admin',      'a0000000-0000-0000-0000-00000000000a', true,  null, null, null),
  ('11111111-0000-0000-0000-0000000000d2', 'ad2@example.test','Bo',   'AdminB','admin',      'b0000000-0000-0000-0000-00000000000b', true,  null, null, null);

-- learner data: 2 rows each for S1, S2, S3 where the shape allows
insert into student_tracks (student_id, track_slug, program_id)
select s.id, 'track-' || p.k, p.pid from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid,'a'),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a','a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b','b')) as p(sid,pid,k)
join students s on s.id = p.sid;

insert into attendance (student_id, track, week_number, program_id)
select s, 't', w, p from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p), generate_series(1,2) w;

insert into submissions (student_id, track_slug, week_number, description, program_id)
select s, 't', w, 'work by '||s, p from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p), generate_series(1,2) w;

insert into reflections (student_id, track_slug, week_number, responses, program_id)
select s, 't', w, '{"q":"private"}'::jsonb, p from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p), generate_series(1,2) w;

insert into week_progress (user_id, program_id, track_slug, week_number)
select s, p, 't', w from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p), generate_series(1,2) w;

insert into survey_responses (student_id, survey_type, responses, program_id)
select s, t, '{"a":1}'::jsonb, p from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p), (values ('pre'),('post')) x(t);

insert into tutor_messages (student_id, program_id, track_slug, week_number, model)
select s, p, 't', 1, 'm' from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p);

insert into track_completions (student_id, track_slug, program_id)
select s, 't', p from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p);

insert into exam_attempts (exam_id, student_id, answers, score, total)
select 'exam-x', s, '{}'::jsonb, 5, 10 from (values
  ('11111111-0000-0000-0000-000000000001'::uuid),('11111111-0000-0000-0000-000000000002'),('11111111-0000-0000-0000-000000000003')) v(s);

insert into activity_events (user_id, program_id, track_slug, event_type)
select s, p, 't', 'view' from (values
  ('11111111-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-00000000000a'::uuid),
  ('11111111-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-000000000003','b0000000-0000-0000-0000-00000000000b')) v(s,p);

insert into announcements (program_id, track_slug, instructor_id, message, expires_at) values
  ('a0000000-0000-0000-0000-00000000000a','t','11111111-0000-0000-0000-0000000000a1','hello A', now() + interval '1 day'),
  ('b0000000-0000-0000-0000-00000000000b','t','11111111-0000-0000-0000-0000000000d2','hello B', now() + interval '1 day');

insert into allowed_signup_emails (email, track_slug) values
  ('s1@example.test','t'), ('s2@example.test','t'), ('s3@example.test','t');
insert into invites (token, email, track_slug, program_slug) values
  ('tok-s1','s1@example.test','t','prog-a'), ('tok-s3','s3@example.test','t','prog-b');
insert into admin_access_log (actor_user_id, program_id, action, resource, row_count) values
  ('11111111-0000-0000-0000-0000000000d1','a0000000-0000-0000-0000-00000000000a','view','students',3),
  ('11111111-0000-0000-0000-0000000000d2','b0000000-0000-0000-0000-00000000000b','view','students',1);
insert into instructor_tracks (student_id, track_slug, program_id) values
  ('11111111-0000-0000-0000-0000000000a1','t','a0000000-0000-0000-0000-00000000000a');
commit;
