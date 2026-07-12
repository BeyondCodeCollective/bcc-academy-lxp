-- Index on students.email — the login callback queries students by email
-- on every magic-link exchange and the admin People tab filters by email.
-- The PK is students(id), so email lookups currently do a seq scan.
-- Idempotent; safe to re-run.

create index if not exists idx_students_email on students (email);
