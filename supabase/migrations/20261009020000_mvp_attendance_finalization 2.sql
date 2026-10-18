-- LOCAL DRAFT. Apply only after review, after 20261009010000. No backfill.
begin;
alter table public.mvp_attendance_reviews
  add column supersedes_id uuid references public.mvp_attendance_reviews(id),
  add column review_reason text check (length(btrim(review_reason)) between 1 and 2000);

-- Serialize each learner/session's revision check and insert. The server must
-- authorize the actor and independently verify course delivery before calling.
create function public.finalize_mvp_attendance_review(p_decision jsonb, p_actor uuid)
returns public.mvp_attendance_reviews
language plpgsql security definer set search_path = '' as $$
declare
  previous public.mvp_attendance_reviews;
  saved public.mvp_attendance_reviews;
  target_program uuid := (p_decision->>'programId')::uuid;
  target_student uuid := (p_decision->>'learnerId')::uuid;
  target_track text := p_decision->>'courseSlug';
  target_week integer := (p_decision->>'weekNumber')::integer;
  target_session integer := (p_decision->>'sessionNumber')::integer;
  expected integer := (p_decision->>'expectedRevision')::integer;
begin
  if expected is null or expected < 0 or p_actor is null or
     length(btrim(coalesce(p_decision->>'reason', ''))) not between 1 and 2000 then
    raise exception 'Invalid attendance review';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    pg_catalog.jsonb_build_array(target_program, target_student, target_track, target_week, target_session)::text, 0));
  select * into previous from public.mvp_attendance_reviews
    where program_id = target_program and student_id = target_student and track_slug = target_track
      and week_number = target_week and session_number = target_session
    order by revision desc limit 1;
  if coalesce(previous.revision, 0) <> expected then
    raise exception using errcode = '40001', message = 'Attendance review changed; reload before saving';
  end if;
  if p_decision->>'outcome' = 'absent' and exists (
    select 1 from public.attendance where student_id = target_student and track = target_track
      and week_number = target_week and session_number = target_session
  ) then
    raise exception 'Resolve conflicting positive attendance before confirming absence';
  end if;
  insert into public.mvp_attendance_reviews
    (program_id, student_id, track_slug, week_number, session_number, session_held_at,
     eligibility, eligibility_basis, outcome, recorded_by, recorded_at, supersedes_id, review_reason)
  values (target_program, target_student, target_track, target_week, target_session,
    (p_decision->>'heldAt')::timestamptz, p_decision->>'eligibility',
    nullif(btrim(p_decision->>'eligibilityBasis'), ''), p_decision->>'outcome',
    p_actor, clock_timestamp(), previous.id, btrim(p_decision->>'reason')) returning * into saved;
  return saved;
end;
$$;

-- Service callers cannot bypass the optimistic lock by directly inserting.
revoke insert on public.mvp_attendance_reviews from service_role;
revoke all on function public.finalize_mvp_attendance_review(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.finalize_mvp_attendance_review(jsonb, uuid) to service_role;
commit;
