-- Add instructor-editable override fields to session_content.
-- These override the hardcoded program config values when set.
-- NULL = use default from config.

alter table session_content
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists description text,
  add column if not exists objectives jsonb;
