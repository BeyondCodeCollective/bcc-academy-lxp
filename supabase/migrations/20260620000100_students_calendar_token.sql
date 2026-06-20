-- Per-student secret token for the iCal calendar feed.
-- Calendar apps (Google/Apple/Outlook) fetch the feed unauthenticated — no
-- session cookie — so the URL itself carries identity via this opaque token.
-- Generated lazily the first time a student opens the subscribe URL on the
-- settings page (see ensureCalendarToken); nullable until then.

alter table students
  add column if not exists calendar_token uuid;

-- Feed lookups are by token; keep them index-backed.
create unique index if not exists idx_students_calendar_token
  on students(calendar_token)
  where calendar_token is not null;
