-- Per-page theme for campaign landing pages: 'dark' flips the page onto logo
-- black with cream ink. NULL = the default light page.
alter table landing_pages add column if not exists page_theme text;
