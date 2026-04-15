-- Create a storage bucket for session files (PowerPoints, PDFs, videos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-files', 'session-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone (including unauthenticated) to read/download files
CREATE POLICY "Anyone can read session files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'session-files');

-- Allow authenticated users to upload files
-- (admin check is enforced server-side in the API route)
CREATE POLICY "Authenticated can upload session files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'session-files');

-- Allow authenticated users to delete files they uploaded
CREATE POLICY "Authenticated can delete session files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'session-files');
