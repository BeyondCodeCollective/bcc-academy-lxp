-- Which program owns a landing page — and therefore which brand its URL wears.
--
-- Every campaign page has been served from /bcc/<slug>, where "bcc" is Beyond
-- Code Collective: the platform, not the program. That reads wrong on a Black
-- Girls Code campaign. bccacademy.io/bcc/shes-built-for-this is a BGC page
-- under someone else's initials, and it's the URL that goes on the flyer.
--
-- landing_pages had no program at all, so there was nothing to derive a brand
-- from. This adds one. The URL follows it: a page with a program is served at
-- /<program-slug>/<slug>, a page without one stays at /bcc/<slug>. Nothing
-- moves until a page is given a program, and the old path redirects to the new
-- one either way, so links already on a flyer keep working.
--
-- Additive + idempotent.

alter table landing_pages
  add column if not exists program_id uuid references programs(id) on delete set null;

create index if not exists landing_pages_program_idx
  on landing_pages (program_id);

comment on column landing_pages.program_id is
  'Owning program. Drives the URL brand segment: /<program slug>/<slug>. NULL = platform page, served at /bcc/<slug>.';
