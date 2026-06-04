-- Add phase column to track_overrides so admins can set the grouping
-- for any track (hardcoded or builder-created) without a code deploy.
-- NULL means fall back to the TS config default (or "core" for DB-only tracks).
alter table track_overrides
  add column if not exists phase text
    check (phase in ('foundation', 'core', 'workshop', 'exit', 'other'));
