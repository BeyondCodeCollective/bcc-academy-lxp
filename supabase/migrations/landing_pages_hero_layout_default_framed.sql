-- New landing pages start on the text-led framed hero. Existing pages were
-- switched to 'framed' by hand on 2026-11-10; set 'split' to opt a page out.
alter table landing_pages alter column hero_layout set default 'framed';
