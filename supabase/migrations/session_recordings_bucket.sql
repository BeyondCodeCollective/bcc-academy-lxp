-- Private bucket for class recordings imported from Zoom by
-- /api/cron/zoom-recordings.
--
-- PRIVATE, unlike the older `session-files` bucket. These are recordings of
-- live classes: minors are visible and audible in several of these cohorts, and
-- a public bucket makes every one of them a guessable URL away. Students reach
-- them only through a short-lived signed URL minted server-side on the week
-- page, for a course they're enrolled in.
--
-- No RLS policies, deliberately: anon and authed can do nothing here directly.
-- The cron writes with the service role; the week page reads with it to sign.
--
-- No file_size_limit: a two-hour class runs 200 MB to 1 GB and the cron is the
-- only writer, so the cap would only ever reject our own import.

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('session-recordings', 'session-recordings', false, array['video/mp4'])
on conflict (id) do update
set public = excluded.public,
    allowed_mime_types = excluded.allowed_mime_types;
