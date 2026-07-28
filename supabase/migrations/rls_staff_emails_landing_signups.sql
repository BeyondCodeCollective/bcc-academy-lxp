-- Both tables shipped without RLS while carrying the default Supabase grants,
-- which give `anon` full SELECT/INSERT/UPDATE/DELETE. The anon key ships in the
-- browser bundle by design, so both were writable from the open internet.
--
-- staff_emails was the sharp one: resolveIsStaff() reads it at login to set
-- students.is_staff, so anyone could have added their own email and come back
-- as staff. landing_signups holds signup PII (name, email, session_id).
--
-- Every code path that touches either table uses the service client
-- (actions-staff.ts, lib/auth/staff.ts, bcc/[slug]/enroll-action.ts), and the
-- service role bypasses RLS. So RLS with no policies is the whole fix: server
-- access is unchanged, anon and authenticated are denied outright. This matches
-- how the other server-only tables here are already set up (invites,
-- lunch_learns, admin_access_log).
--
-- Applied to production 2026-07-28.

alter table public.staff_emails enable row level security;
alter table public.landing_signups enable row level security;
