-- Org branding (phase 1 of the DB-driven migration): accent color + logo per
-- program row. Dynamic orgs read these at request time; null = platform
-- default (cobalt). Applied to prod 2026-08-03.
alter table programs
  add column if not exists accent text,
  add column if not exists logo_url text;
