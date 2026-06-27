-- Security (P1): the `students` SELECT policy was `auth.role() = 'authenticated'`,
-- which let ANY logged-in user read EVERY row (name, email, role, program_id,
-- calendar_token) across all programs/cohorts via the browser anon key against
-- PostgREST. Scope it to own-row + staff.
--
-- Verified-safe blast radius: every cross-user read in the app (rosters,
-- insights, analytics, certificates, embedded name joins) uses the service-role
-- client, which BYPASSES RLS and is unaffected. The only RLS-respecting reads of
-- other users' rows are the attendance admin checks (api/attendance/route.ts),
-- where the caller is already verified staff — covered by the staff clause. The
-- `auth.uid() = id` self-clause keeps the per-request profile load
-- (lib/auth/session.ts) working on every authenticated request.
--
-- NOTE: a SELECT policy that subqueries its own table triggers Postgres
-- "infinite recursion detected in policy". We therefore read the caller's role
-- through a SECURITY DEFINER helper, which runs with the function owner's rights
-- and is NOT subject to the students RLS policy — breaking the recursion.

create or replace function public.current_user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students
    where id = auth.uid()
      and role in ('instructor', 'admin', 'super_admin')
  );
$$;

revoke all on function public.current_user_is_staff() from public;
grant execute on function public.current_user_is_staff() to authenticated;

drop policy if exists "Authenticated can read students" on public.students;

create policy "Read own row or staff"
  on public.students
  for select
  to authenticated
  using (
    auth.uid() = id
    or public.current_user_is_staff()
  );
