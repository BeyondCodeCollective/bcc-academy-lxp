-- Remove the restrictive CHECK constraint that only allows 'mass' and 'techplus'.
-- Forge tracks (ai-fundamentals, ai-digital-natives, ai-automation-bootcamp) need
-- to store session content too.

alter table session_content drop constraint if exists session_content_track_check;
