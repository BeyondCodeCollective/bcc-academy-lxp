-- Homework instructions per session. Session 1 keeps using homework_instructions
-- (added earlier); sessions 2 and 3 mirror the meeting_link_2/_3 pattern.
alter table session_content
  add column if not exists homework_instructions_2 text,
  add column if not exists homework_instructions_3 text;
