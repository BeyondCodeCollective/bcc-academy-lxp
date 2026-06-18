-- Make a course's office hours / live sessions editable from the admin course
-- editor (previously hardcoded in TS config, e.g. forte.ts). NULL = use the TS
-- config default; a JSON array overrides it.
--
-- Shape: OfficeHour[] —
--   { date: "YYYY-MM-DD", time: string, title: string, description: string,
--     joinUrl?: string, dialIn?: string }

alter table track_overrides
  add column if not exists office_hours jsonb default null;
