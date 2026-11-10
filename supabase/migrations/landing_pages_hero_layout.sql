-- Per-page hero layout. 'split' (default, null) is the edge-to-edge 52% image
-- panel; 'framed' centers the page and shows the hero as a framed picture
-- beside a wider, text-led copy column.
alter table landing_pages
  add column if not exists hero_layout text
  check (hero_layout is null or hero_layout in ('split', 'framed'));
