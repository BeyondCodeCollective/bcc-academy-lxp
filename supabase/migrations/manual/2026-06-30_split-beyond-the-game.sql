-- Manual production data migration — Split "Beyond the Game" (formerly After The
-- Game / atg) out of Catalyst, and re-home mis-stamped survey responses.
--
-- Run ONCE against production (East: qrtvbclbrumsrwbugvrr) via MCP/psql. NOT an
-- auto-applied schema migration — lives under migrations/manual/ so it never
-- runs twice. Idempotent: re-running is a no-op (selectors only match catalyst).
--
-- Context: all survey/enrollment data historically landed under program_id =
-- catalyst regardless of the learner's real program. Students are now correctly
-- split (BCC learners already under beyond-code-centers); this fixes the
-- remaining rows so Beyond the Game and Beyond Code Centers each stand alone.

BEGIN;

-- 1. Move the 4 Beyond the Game learners (role=student, enrolled in mass/techplus,
--    still mis-homed under catalyst) to the atg program.   [expect: 4 rows]
UPDATE students
SET program_id = (SELECT id FROM programs WHERE slug = 'atg')
WHERE role = 'student'
  AND program_id = (SELECT id FROM programs WHERE slug = 'catalyst')
  AND id IN (SELECT student_id FROM student_tracks WHERE track_slug IN ('mass', 'techplus'));

-- 2. Move every mass/techplus enrollment (athletes + staff preview rows) to atg,
--    so the tracks' enrollments live under the program that now owns them. [16]
UPDATE student_tracks
SET program_id = (SELECT id FROM programs WHERE slug = 'atg')
WHERE track_slug IN ('mass', 'techplus')
  AND program_id = (SELECT id FROM programs WHERE slug = 'catalyst');

-- 3. Move the tracks' curriculum content + live metadata overrides to atg, so the
--    program-scoped content lookups resolve under Beyond the Game.   [10 + 2]
UPDATE session_content
SET program_id = (SELECT id FROM programs WHERE slug = 'atg')
WHERE track IN ('mass', 'techplus')
  AND program_id = (SELECT id FROM programs WHERE slug = 'catalyst');

UPDATE track_overrides
SET program_id = (SELECT id FROM programs WHERE slug = 'atg')
WHERE track_slug IN ('mass', 'techplus')
  AND program_id = (SELECT id FROM programs WHERE slug = 'catalyst');

-- 4. Re-home every authenticated survey response to its student's CURRENT program.
--    Fixes the historical mis-stamp: Beyond Code Centers' AI Fundamentals
--    responses (21) -> beyond-code-centers, the 1 Forte response -> forte, and the
--    athletes' 6 -> atg (step 1 already moved those students).   [~28 rows]
UPDATE survey_responses sr
SET program_id = s.program_id
FROM students s
WHERE s.id = sr.student_id
  AND sr.program_id IS DISTINCT FROM s.program_id;

-- 5. Re-home PUBLIC (walk-in) survey responses. They carry no student_id (filled
--    via a public link, no login), but every row has an email and 23 of 43 match
--    a real account. Attribute each matched response to that student's program;
--    unmatched prospects (Security+/Network+ applicants, learn-more leads) keep
--    their current Catalyst program_id, which is correct.   [~7 rows move]
UPDATE public_survey_responses pr
SET program_id = s.program_id
FROM students s
WHERE lower(s.email) = lower(pr.email)
  AND pr.program_id IS DISTINCT FROM s.program_id;

COMMIT;
