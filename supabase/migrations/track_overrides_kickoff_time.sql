-- Exact first-session start for a cohort, as an absolute instant.
--
-- `start_date` is a bare date, which is enough to gate access but not enough to
-- put on someone's calendar. Course Builder (DB-only) tracks had no way to say
-- "6:30pm ET", so the holding page's add-to-calendar button fell back to
-- `<start_date>T09:00:00Z` — 5:00am ET — and cheerfully handed learners a
-- reminder fourteen hours before the real thing.
--
-- Mirrors TrackConfig.kickoffTimeUtc, which TS-config tracks already have.
-- NULL = unknown; surfaces that need an exact time must hide rather than guess.
alter table track_overrides
  add column if not exists kickoff_time_utc timestamptz;

comment on column track_overrides.kickoff_time_utc is
  'Exact first-session start (absolute instant). NULL = unknown; never guess a time from start_date.';
