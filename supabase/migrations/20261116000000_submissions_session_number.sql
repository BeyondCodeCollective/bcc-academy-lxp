-- Homework per session. A week with two sessions used to keep one submission
-- row, so session 2's homework overwrote session 1's. Key the row by session,
-- mirroring session_exit_surveys. Existing rows become session 1.
--
-- Applied in two steps so neither the old nor the new deploy is ever without
-- a matching ON CONFLICT target: step 1 before the deploy, step 2 after it.

-- Step 1
alter table submissions
  add column if not exists session_number int not null default 1
    check (session_number between 1 and 5);
alter table submissions
  add constraint submissions_student_track_week_session_key
    unique (student_id, track_slug, week_number, session_number);

-- Step 2
alter table submissions
  drop constraint if exists submissions_student_id_track_slug_week_number_key;
