-- One signup row per (page, email, session) instead of per (page, email).
-- The old key made a returning attendee's registration for a second date look
-- like a duplicate: enrolled, but no confirmation email and no signup row
-- (found 2026-10-16: 10 Catalyst Labs people registering for another date).
-- Pages without sessions keep one row per email (null session counts as '').
alter table landing_signups drop constraint if exists landing_signups_slug_email_key;
drop index if exists landing_signups_slug_email_key;
create unique index if not exists landing_signups_slug_email_session_key
  on landing_signups (slug, email, coalesce(session_id, ''));
