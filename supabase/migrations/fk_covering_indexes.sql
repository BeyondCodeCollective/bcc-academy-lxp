-- Covering indexes for foreign keys that had none. Postgres does NOT auto-index
-- FK columns, so joins and (critically) cascade-deletes on the referenced row
-- do a sequential scan of the child table. Negligible today, but a real cost as
-- the platform scales toward thousands of learners. Flagged by the Supabase
-- performance advisor (unindexed_foreign_keys). All additive + idempotent.

create index if not exists idx_admin_access_log_program_id   on admin_access_log (program_id);
create index if not exists idx_allowed_signup_emails_added_by on allowed_signup_emails (added_by);
create index if not exists idx_announcements_instructor_id    on announcements (instructor_id);
create index if not exists idx_attendance_marked_by           on attendance (marked_by);
create index if not exists idx_attendance_student_id          on attendance (student_id);
create index if not exists idx_hidden_courses_hidden_by       on hidden_courses (hidden_by);
create index if not exists idx_lunch_learns_created_by        on lunch_learns (created_by);
create index if not exists idx_resources_cohort_id            on resources (cohort_id);
create index if not exists idx_resources_updated_by           on resources (updated_by);
create index if not exists idx_session_content_updated_by     on session_content (updated_by);
create index if not exists idx_sessions_cohort_id             on sessions (cohort_id);
create index if not exists idx_students_cohort_id             on students (cohort_id);
create index if not exists idx_submission_feedback_reflection_id on submission_feedback (reflection_id);
create index if not exists idx_submission_feedback_reviewer_id   on submission_feedback (reviewer_id);
create index if not exists idx_submission_feedback_submission_id on submission_feedback (submission_id);
create index if not exists idx_track_completions_program_id   on track_completions (program_id);
create index if not exists idx_track_overrides_updated_by     on track_overrides (updated_by);
