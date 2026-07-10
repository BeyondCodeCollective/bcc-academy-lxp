-- Course cover artwork shown at the top of the course overview page.
-- Distinct from landing_pages.hero_image_url (a public marketing page) so an
-- instructor's course art never rewrites a public page. Repo path or URL.
alter table track_overrides add column if not exists cover_image_url text;
