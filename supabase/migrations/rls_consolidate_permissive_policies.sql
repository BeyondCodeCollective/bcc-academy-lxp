-- Reduce overlapping permissive policies (Supabase multiple_permissive_policies)
-- + close a cross-program read exposure. Two safe, behavior-preserving changes
-- (app reads/writes for these tables use the service client, which is RLS-exempt).
--
-- 1) session_content: drop the "Authenticated can read" USING(true) policy that
--    let ANY signed-in user read EVERY program's session content. The per-program
--    policy remains, scoping reads to the user's own program — a real
--    cross-program exposure fix, and it leaves a single SELECT policy.
--
-- 2) track_completions: drop "Students can view own completions" — fully
--    subsumed by the intentional public "Anyone can view certificates by ID"
--    (true) policy for shareable certificate links. No access change.

drop policy if exists "Authenticated can read session_content" on public.session_content;
drop policy if exists "Students can view own completions" on public.track_completions;
