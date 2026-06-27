-- Security fix (P2): two PostgREST/storage exposures reachable by any signed-in user.
--
-- 1) lunch_learns had `to authenticated` policies with USING/WITH CHECK (true)
--    for SELECT/INSERT/UPDATE/DELETE. The intended admin gate lives only in the
--    server actions, but PostgREST exposes the table directly — so any student's
--    JWT could read every recording link AND insert/alter/delete rows
--    (vandalism, phishing recording_url). Every reader/writer in the app uses
--    the service-role client (createServiceClient), which bypasses RLS, so we
--    drop all four policies and leave RLS enabled = deny-by-default, matching
--    `invites` and `admin_access_log`.
drop policy if exists "lunch_learns read for signed-in"   on public.lunch_learns;
drop policy if exists "lunch_learns write for signed-in"  on public.lunch_learns;
drop policy if exists "lunch_learns update for signed-in" on public.lunch_learns;
drop policy if exists "lunch_learns delete for signed-in" on public.lunch_learns;

-- 2) The public `session-files` bucket had a broad SELECT policy on
--    storage.objects (`to public using bucket_id='session-files'`). For a PUBLIC
--    bucket, object URLs (/storage/v1/object/public/...) resolve WITHOUT any RLS
--    policy, so this policy was only enabling clients to LIST every file in the
--    bucket (enumerate other students' uploaded submissions). The app never
--    calls .list() and serves files via public URLs, so dropping it removes the
--    listing capability while downloads keep working.
--    (Both historical names are dropped defensively.)
drop policy if exists "Public can read session files" on storage.objects;
drop policy if exists "Anyone can read session files" on storage.objects;
