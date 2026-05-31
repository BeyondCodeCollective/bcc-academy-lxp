-- Migrate entrepreneurship-101 from standalone dynamic program to a Catalyst track.
-- After this runs:
--   • track_overrides rows for entrepreneurship-101 live under Catalyst's program_id
--   • student_tracks enrollments for entrepreneurship-101 point to Catalyst
--   • The standalone programs row is deactivated (is_dynamic = false) so it no longer
--     appears in the dynamic-programs query or the course builder uniqueness check
DO $$
DECLARE
  v_catalyst_id uuid;
  v_e101_id uuid;
BEGIN
  SELECT id INTO v_catalyst_id FROM programs WHERE slug = 'catalyst';
  SELECT id INTO v_e101_id FROM programs WHERE slug = 'entrepreneurship-101' AND is_dynamic = true;

  IF v_e101_id IS NULL THEN
    RAISE NOTICE 'entrepreneurship-101 dynamic program not found — nothing to migrate';
    RETURN;
  END IF;

  IF v_catalyst_id IS NULL THEN
    RAISE EXCEPTION 'Catalyst program not found — cannot migrate';
  END IF;

  -- Move track_overrides row to Catalyst
  UPDATE track_overrides
  SET program_id = v_catalyst_id
  WHERE program_id = v_e101_id;

  -- Move student enrollments to Catalyst
  UPDATE student_tracks
  SET program_id = v_catalyst_id
  WHERE program_id = v_e101_id;

  -- Deactivate the standalone program row (is_dynamic = false hides it from all queries)
  UPDATE programs SET is_dynamic = false WHERE id = v_e101_id;

  RAISE NOTICE 'Migrated entrepreneurship-101 to Catalyst (catalyst_id=%)', v_catalyst_id;
END $$;
