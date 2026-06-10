-- Add session 3 fields for events with three sessions in one week (e.g. Roblox 3-day camp)
alter table session_content
  add column if not exists meeting_link_3 text,
  add column if not exists recording_url_3 text,
  add column if not exists status_3 text not null default 'upcoming';
