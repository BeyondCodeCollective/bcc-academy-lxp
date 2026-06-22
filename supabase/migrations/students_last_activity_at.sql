-- Distinguish "last active" from "last login". `last_seen_at` is written only
-- in the auth callback, so it tracks logins, not engagement — a learner who
-- signs in and browses lessons for an hour without re-logging-in looks idle.
-- `last_activity_at` is bumped (throttled) on dashboard navigation in
-- getSessionContext, so admins can tell active learners from bouncers.
-- Idempotent; safe to re-run.

alter table students add column if not exists last_activity_at timestamptz;
