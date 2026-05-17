-- Historical enrollments imported from external systems (Circle, IBM
-- SkillsBuild, etc.). These are people who took our courses before the
-- LXP existed. We count them for "Students served" without giving them
-- LXP accounts or polluting auth.users.
--
-- Deduped per (source, email, track_slug). If the same person took
-- multiple tracks we get one row per (track, source).

CREATE TABLE IF NOT EXISTS public.alumni_enrollments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  track_slug    text NOT NULL,
  source        text NOT NULL,                          -- e.g. 'circle-2026'
  email         text NOT NULL,
  first_name    text,
  last_name     text,
  enrolled_at   date,                                   -- best-effort, may be null
  imported_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, email, track_slug)
);

CREATE INDEX IF NOT EXISTS alumni_enrollments_program_track_idx
  ON public.alumni_enrollments (program_id, track_slug);

CREATE INDEX IF NOT EXISTS alumni_enrollments_email_idx
  ON public.alumni_enrollments (email);

ALTER TABLE public.alumni_enrollments ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin-panel users can read. No write policies — only
-- the service role (import script, admin tooling) writes.
CREATE POLICY "alumni_enrollments_admin_read"
  ON public.alumni_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = auth.uid()
        AND s.role IN ('instructor', 'admin', 'super_admin')
    )
  );
