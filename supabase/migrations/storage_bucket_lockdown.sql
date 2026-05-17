-- Lock down the session-files bucket so authenticated clients can only
-- upload to their own folder and only with permitted MIME types. Admin
-- uploads go through /api/upload which uses the service-role client and
-- bypasses RLS entirely, so this only constrains direct-from-browser
-- uploads (student submissions in src/components/submission-form.tsx).
--
-- Before this change: any logged-in user could write any file (including
-- .html) to any path in the public bucket — phishing surface.

-- Size + MIME constraints at the bucket level
UPDATE storage.buckets
   SET file_size_limit = 52428800,                  -- 50 MB, matches /api/upload
       allowed_mime_types = ARRAY[
         'application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/msword',
         'application/vnd.ms-powerpoint',
         'application/vnd.ms-excel',
         'application/zip',
         'image/png',
         'image/jpeg',
         'image/gif',
         'image/webp',
         'video/mp4',
         'video/quicktime',
         'video/webm',
         'text/plain'
       ]
 WHERE id = 'session-files';

-- Replace the wide-open INSERT policy with a path-scoped one. Authenticated
-- users may only insert into `submissions/<track>/<week>/<their-uid>/...`.
-- Admin uploads (track/week/... paths used by /api/upload) keep working via
-- service role.
DROP POLICY IF EXISTS "Authenticated can upload session files" ON storage.objects;
CREATE POLICY "Students upload to own submission folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-files'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[4] = auth.uid()::text
);

-- Same tightening for DELETE — only your own submission files.
DROP POLICY IF EXISTS "Authenticated can delete session files" ON storage.objects;
CREATE POLICY "Students delete from own submission folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'session-files'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[4] = auth.uid()::text
);
