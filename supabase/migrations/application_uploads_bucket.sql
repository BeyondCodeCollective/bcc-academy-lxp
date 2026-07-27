-- Private storage bucket for resumes attached to applications (currently the
-- Home for the Summer application).
--
-- The bucket was created by hand on 2026-07-24, ahead of the code. This file
-- records it so a fresh environment gets the same thing, and so the config
-- lives in the repo rather than only in one project's dashboard.
--
-- PRIVATE on purpose. The Home for the Summer application is a PUBLIC form —
-- anyone with the link can submit — so files here are written by
-- unauthenticated strangers and read back only by staff. A public bucket would
-- put every applicant's resume, carrying their name and phone number, one
-- guessable URL away.
--
-- No RLS policies, deliberately: with none, anon and authed roles can do nothing
-- here at all. Every read and write goes through the service-role client in a
-- server action, which is where the checks storage can't do are enforced
-- (extension + MIME + magic-byte allowlist, size cap, server-generated
-- filename). Staff downloads use 5-minute signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880, -- 5 MB; the server action enforces this too, so the cap holds even if
           -- a future caller reaches storage another way.
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
