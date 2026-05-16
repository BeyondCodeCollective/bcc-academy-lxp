-- Consolidate ATG, Forge, and Forte into one Catalyst program
-- Run this in the Supabase SQL Editor AFTER deploying the code changes.
--
-- The existing "catalyst" shell row in the programs table gets reused
-- as the home for all students. ATG, Forge, and Forte students/data
-- are moved under it.

BEGIN;

-- 1. Ensure the catalyst program row exists
INSERT INTO programs (slug, name, domain)
VALUES ('catalyst', 'Catalyst', 'bccacademy.io')
ON CONFLICT (slug) DO UPDATE SET name = 'Catalyst', domain = 'bccacademy.io';

-- 2. Create a default cohort for Catalyst
INSERT INTO cohorts (name, display_name, start_date, total_weeks, program_id)
SELECT 'catalyst-cohort-1', 'Catalyst — Cohort 1', '2026-03-24', 10,
       (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE NOT EXISTS (
  SELECT 1 FROM cohorts WHERE name = 'catalyst-cohort-1'
);

-- 3. Move ALL students from ATG, Forge, Forte → Catalyst
UPDATE students SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 4. Assign a cohort to students who don't have one
UPDATE students SET
  cohort_id = (SELECT id FROM cohorts WHERE name = 'catalyst-cohort-1' LIMIT 1)
WHERE program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
  AND cohort_id IS NULL;

-- 5. Move student_tracks
UPDATE student_tracks SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 6. Move attendance records
UPDATE attendance SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 7. Move submissions
UPDATE submissions SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 8. Move reflections
UPDATE reflections SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 9. Move session_content
UPDATE session_content SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 10. Move survey_responses
UPDATE survey_responses SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 11. Move announcements
UPDATE announcements SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 12. Move tutor_messages
UPDATE tutor_messages SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 13. Move cohorts
UPDATE cohorts SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

-- 14. Move instructor_tracks
UPDATE instructor_tracks SET
  program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
WHERE program_id IN (
  SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte')
);

COMMIT;

-- Verification queries:
-- SELECT slug, name, domain FROM programs WHERE slug = 'catalyst';
-- SELECT count(*) as total_students FROM students WHERE program_id = (SELECT id FROM programs WHERE slug = 'catalyst');
-- SELECT track_slug, count(*) FROM student_tracks WHERE program_id = (SELECT id FROM programs WHERE slug = 'catalyst') GROUP BY track_slug;
-- SELECT count(*) as orphaned FROM students WHERE program_id IN (SELECT id FROM programs WHERE slug IN ('atg', 'forge', 'forte'));
