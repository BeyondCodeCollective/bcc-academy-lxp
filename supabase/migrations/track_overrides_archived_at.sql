-- Adds archived_at to track_overrides to support archiving builder-created courses.
-- NULL = active. Non-null = archived: students lose access, join links blocked.
-- Reversible: unarchive sets archived_at back to NULL.
alter table track_overrides
  add column if not exists archived_at timestamptz default null;
