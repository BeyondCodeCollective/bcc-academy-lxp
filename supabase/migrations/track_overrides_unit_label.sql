-- Per-track unit label ("Week" default, "Day" for a 3-day bootcamp, etc.).
-- Drives every "Week N" rendering (carousel, week pages, nav, CTAs, admin editor)
-- so the noun is DB-editable per track instead of hardcoded. Additive + nullable;
-- null falls back to "Week". Applied to prod 2026-07-01.
alter table track_overrides add column if not exists unit_label text;
