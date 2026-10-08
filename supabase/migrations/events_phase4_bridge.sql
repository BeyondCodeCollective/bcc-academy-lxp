-- Event management, phase 4: the bridge from event attendee to learner.
-- An attendee who later gets an account (applies, enrolls, is invited) is
-- linked by student_id so their event history travels with them. Matching
-- is parent email + attendee name (a child on the parent's email), or parent
-- email alone when the parent is the learner (adult events). Never deleted
-- with the student: the history stays on the event.
-- Idempotent; safe to re-run.

alter table event_attendees
  add column if not exists student_id uuid references students(id) on delete set null,
  add column if not exists linked_at timestamptz;

alter table event_registrations
  add column if not exists student_id uuid references students(id) on delete set null;

create index if not exists idx_event_attendees_student
  on event_attendees(student_id) where student_id is not null;

create index if not exists idx_event_registrations_student
  on event_registrations(student_id) where student_id is not null;

-- The nightly link pass scans unlinked attendees by parent email.
create index if not exists idx_event_attendees_unlinked
  on event_attendees(registration_id) where student_id is null;
