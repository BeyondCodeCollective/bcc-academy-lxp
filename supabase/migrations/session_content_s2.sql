-- Add session 2 fields for Tech+ (two sessions per week)
alter table session_content
  add column if not exists meeting_link_2 text,
  add column if not exists recording_url_2 text;
