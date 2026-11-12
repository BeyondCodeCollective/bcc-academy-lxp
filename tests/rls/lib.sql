-- Test helpers, loaded by run.sh into lxp_audit_rls (schema rlstest). Idempotent.
drop schema if exists rlstest cascade;
create schema rlstest;
grant usage on schema rlstest to public;

-- one line per assertion: RLSRESULT|PASS|FAIL|INFO|<name>|<detail>
create function rlstest.check(n text, ok boolean, note text default '') returns void language plpgsql as $$
begin raise notice 'RLSRESULT|%|%|%', case when ok then 'PASS' else 'FAIL' end, n, note; end $$;
create function rlstest.info(n text, note text default '') returns void language plpgsql as $$
begin raise notice 'RLSRESULT|INFO|%|%', n, note; end $$;

-- run a statement under the CURRENT role, report outcome, always roll the statement back.
-- returns 'n:<rows>' on success, 'e:<sqlstate>' on error. 42501 = denied by privilege or RLS WITH CHECK.
create function rlstest.try(stmt text) returns text language plpgsql as $$
declare n bigint; st text;
begin
  begin
    execute stmt; get diagnostics n = row_count;
    raise exception 'rlstest_rollback:%', n;
  exception when others then
    get stacked diagnostics st = returned_sqlstate;
    if sqlerrm like 'rlstest_rollback:%' then return 'n:' || substring(sqlerrm from 18); end if;
    return 'e:' || st;
  end;
end $$;
-- true if the statement changed/inserted at least one row, or failed with a non-RLS error after passing RLS (insert only)
create function rlstest.wrote(r text) returns boolean language sql immutable as $$ select r ~ '^n:[1-9]' $$;

-- visible row count of a query under the current role; -1 if the role is denied outright
create function rlstest.cnt(q text) returns bigint language plpgsql as $$
declare n bigint;
begin execute 'select count(*) from (' || q || ') x' into n; return n;
exception when insufficient_privilege then return -1; end $$;

create function rlstest.as_user(uid uuid, mail text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', mail)::text, true);
  execute 'set local role authenticated';
end $$;
create function rlstest.as_anon() returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', '', true); execute 'set local role anon'; end $$;
create function rlstest.as_super() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claims', '', true); end $$;

-- identities (see seed.sql)
create table rlstest.who (k text primary key, id uuid, email text, prog uuid);
insert into rlstest.who values
 ('S1','11111111-0000-0000-0000-000000000001','s1@example.test','a0000000-0000-0000-0000-00000000000a'),
 ('S2','11111111-0000-0000-0000-000000000002','s2@example.test','a0000000-0000-0000-0000-00000000000a'),
 ('S3','11111111-0000-0000-0000-000000000003','s3@example.test','b0000000-0000-0000-0000-00000000000b'),
 ('I1','11111111-0000-0000-0000-0000000000a1','i1@example.test','a0000000-0000-0000-0000-00000000000a'),
 ('AD1','11111111-0000-0000-0000-0000000000d1','ad1@example.test','a0000000-0000-0000-0000-00000000000a'),
 ('AD2','11111111-0000-0000-0000-0000000000d2','ad2@example.test','b0000000-0000-0000-0000-00000000000b');
grant select on rlstest.who to public;

-- learner-data tables: owner predicate template (%1$L = user id, %2$L = email)
create table rlstest.learner (tbl text primary key, owner_pred text not null);
insert into rlstest.learner values
 ('students','id = %1$L'), ('student_tracks','student_id = %1$L'), ('attendance','student_id = %1$L'),
 ('submissions','student_id = %1$L'), ('reflections','student_id = %1$L'), ('week_progress','user_id = %1$L'),
 ('survey_responses','student_id = %1$L'), ('tutor_messages','student_id = %1$L'),
 ('track_completions','student_id = %1$L'), ('exam_attempts','student_id = %1$L'),
 ('activity_events','user_id = %1$L'), ('allowed_signup_emails','email = %2$L'), ('invites','email = %2$L'),
 ('notification_preferences','student_id = %1$L'), ('push_subscriptions','student_id = %1$L'),
 ('assessment_progress','student_id = %1$L'), ('assessment_results','student_id = %1$L'),
 ('lpat_confidence','student_id = %1$L'), ('session_exit_surveys','student_id = %1$L'),
 ('alumni_enrollments','student_id = %1$L');
-- keep only tables/columns that exist after migrations (set by run.sh via prune)
create function rlstest.prune() returns void language plpgsql as $$
declare r record;
begin
  for r in select tbl, owner_pred from rlstest.learner loop
    begin
      execute format('select 1 from public.%I where ', r.tbl) || format(r.owner_pred, '00000000-0000-0000-0000-000000000000', 'x') || ' limit 0';
    exception when others then delete from rlstest.learner where tbl = r.tbl; end;
  end loop;
end $$;
grant select on rlstest.learner to public;

-- count of rows in <tbl> owned by person <k>, as seen by the current role
create function rlstest.seen(tbl text, k text) returns bigint language plpgsql as $$
declare w rlstest.who; p text;
begin
  select * into w from rlstest.who where rlstest.who.k = seen.k;
  select owner_pred into p from rlstest.learner where learner.tbl = seen.tbl;
  return rlstest.cnt(format('select 1 from public.%I where ', tbl) || format(p, w.id::text, w.email));
end $$;
