-- Add status fields for marking sessions as completed
alter table session_content
  add column if not exists status text not null default 'upcoming',
  add column if not exists status_2 text not null default 'upcoming';
