-- Per-page switch: when set, signing up also enrolls an email that already has an
-- account straight away, instead of waiting for the emailed link to be opened.
alter table landing_pages add column if not exists enroll_on_signup boolean not null default false;
