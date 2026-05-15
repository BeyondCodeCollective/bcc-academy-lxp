-- Register the Forte Bahamas program.
-- forte.bccacademy.io serves a 10-session AI literacy program. The auth
-- callback looks up this row by slug to resolve the program UUID, so new
-- signups on the subdomain fail without it. Idempotent; safe to re-run.

insert into programs (slug, name) values
  ('forte', 'Forte Bahamas')
on conflict (slug) do nothing;
