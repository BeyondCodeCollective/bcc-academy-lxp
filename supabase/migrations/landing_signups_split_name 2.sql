-- The /bcc signup form asked for one "Full name", so first/last was a guess at
-- the first space — "Ana M Mendoza-Santiago" became Ana / M Mendoza-Santiago.
-- The form now asks for the two separately; `name` stays populated (the admin
-- Signups page and older cached pages still read it).
alter table public.landing_signups
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- Backfill from the single field so existing rows answer the same questions.
update public.landing_signups
set
  first_name = nullif(split_part(btrim(name), ' ', 1), ''),
  last_name  = nullif(btrim(substr(btrim(name), length(split_part(btrim(name), ' ', 1)) + 1)), '')
where name is not null
  and btrim(name) <> ''
  and first_name is null;
