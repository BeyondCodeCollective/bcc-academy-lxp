-- The program's OWN logo, shown above the headline in the content panel.
-- Distinct from sponsor_logo_url, which is a partner badge over the hero and
-- renders under an "In partnership with" label — wrong for your own lockup.
-- Additive + nullable; pages without one render the text header label as before.
alter table landing_pages add column if not exists logo_url text;
