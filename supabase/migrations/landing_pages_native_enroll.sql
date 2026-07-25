-- Richer detailed-course content + native (no-Eventbrite) enrollment for
-- /bcc/[slug] landing pages. All additive and defaulted, so existing rows
-- render unchanged. Applied to prod 2026-07-25.

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS body_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS instructor jsonb,
  ADD COLUMN IF NOT EXISTS sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS native_enroll boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enroll_cta_label text;

-- One row per native signup. (slug, email) unique makes re-submits idempotent.
CREATE TABLE IF NOT EXISTS landing_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  track_slug text,
  email text NOT NULL,
  name text,
  session_id text,
  invite_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, email)
);
CREATE INDEX IF NOT EXISTS idx_landing_signups_slug ON landing_signups(slug);
CREATE INDEX IF NOT EXISTS idx_landing_signups_email ON landing_signups(email);
