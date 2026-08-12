-- Per-course resources: null track_slug = program-wide (existing behavior),
-- a slug scopes the resource to that course's enrolled learners.
alter table resources add column if not exists track_slug text;
