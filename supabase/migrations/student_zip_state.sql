-- Demographic fields for grant reporting. These are collected in the
-- learner-intake and Network+ surveys (zip_code, state, date_of_birth) but were
-- only ever stored inside the survey `responses` JSON blob, so no export or
-- admin view could read them. Promote them to first-class columns.
--
-- date_of_birth already exists (student_profile_fields.sql); add zip + state.
alter table students
  add column if not exists zip text,
  add column if not exists state text;
