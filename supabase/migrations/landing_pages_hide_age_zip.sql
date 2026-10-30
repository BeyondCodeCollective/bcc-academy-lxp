-- Per-page switch to drop the age-range and ZIP questions from the signup form,
-- for audiences where they do not apply (e.g. an internal staff cohort).
alter table landing_pages add column if not exists hide_age_zip boolean not null default false;
