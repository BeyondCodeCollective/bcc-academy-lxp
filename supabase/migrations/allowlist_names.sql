-- Names from a partner's roster file, carried until the learner signs up.
--
-- Forte Bahamas sends a spreadsheet with a Name column. Until now only the
-- email survived the import, so every learner landed on a blank roster row
-- and was asked for a name the partner had already given us. These columns
-- hold it; auth/callback reads them when it creates the account and then they
-- are just history.
alter table public.allowed_signup_emails
  add column if not exists first_name text,
  add column if not exists last_name  text;
