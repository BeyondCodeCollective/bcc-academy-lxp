-- Indexes for the admin panel hot path.
-- instructor_tracks had no indexes at all; admin/page.tsx hits it on every load
-- via `eq("program_id", ...)` and optionally `eq("student_id", ...)`.
-- Idempotent; safe to re-run.

create index if not exists idx_instructor_tracks_program_id on instructor_tracks(program_id);
create index if not exists idx_instructor_tracks_student_id on instructor_tracks(student_id);
