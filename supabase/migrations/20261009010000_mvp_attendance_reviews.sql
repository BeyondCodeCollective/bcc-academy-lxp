-- LOCAL DRAFT: do not apply until reviewed. No backfill of legacy absences.
-- One append-only staff decision per learner/session revision. A later
-- unresolved decision retracts an earlier finding without deleting history.
begin;

create table public.mvp_attendance_reviews (
  id uuid primary key default gen_random_uuid(),
  revision integer generated always as identity unique,
  program_id uuid not null references public.programs(id),
  student_id uuid not null references public.students(id),
  track_slug text not null check (length(btrim(track_slug)) > 0),
  week_number integer not null check (week_number >= 0),
  session_number integer not null check (session_number between 1 and 3),
  session_held_at timestamptz not null,
  eligibility text not null check (eligibility in ('eligible', 'not_eligible', 'unknown')),
  eligibility_basis text,
  outcome text not null check (outcome in ('present', 'absent', 'excused', 'unknown')),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  constraint mvp_review_eligibility_evidence check (
    eligibility = 'unknown' or length(btrim(coalesce(eligibility_basis, ''))) > 0
  ),
  constraint mvp_review_outcome_eligibility check (
    eligibility = 'eligible' or outcome = 'unknown'
  ),
  constraint mvp_review_held_before_review check (session_held_at <= recorded_at)
);

create index mvp_attendance_reviews_scope_idx on public.mvp_attendance_reviews
  (program_id, track_slug, student_id, week_number, session_number, revision desc);

-- No browser access or student self-finalization. A future server write path
-- must authorize program access, derive recorded_by from the session, and
-- verify schedule/eligibility before inserting. No write endpoint added here.
alter table public.mvp_attendance_reviews enable row level security;
revoke all on public.mvp_attendance_reviews from public, anon, authenticated, service_role;
grant select, insert on public.mvp_attendance_reviews to service_role;
revoke all on sequence public.mvp_attendance_reviews_revision_seq from public, anon, authenticated, service_role;
grant usage on sequence public.mvp_attendance_reviews_revision_seq to service_role;

comment on table public.mvp_attendance_reviews is
  'Append-only staff evidence. Missing rows are unknown, never inferred absence. Corrections append a new revision.';

commit;
