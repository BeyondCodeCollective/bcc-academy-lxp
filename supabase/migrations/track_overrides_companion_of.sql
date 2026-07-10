-- A track that wraps around another one rather than standing on its own.
--
-- MASS Wraparound is coaching *for* the Security+ cohort: every Security+
-- learner is enrolled in both, but only one of them is the course they came
-- for. Without this, "which course do we drop this learner into after login?"
-- has no principled answer and degenerates into a slug heuristic.
--
-- Holds the track_slug of the course it accompanies. NULL = a standalone
-- course. Deliberately not a FK: track slugs also live in TS config, not only
-- in this table.
alter table track_overrides
  add column if not exists companion_of text;

comment on column track_overrides.companion_of is
  'Slug of the course this track wraps around (e.g. MASS → comptia-security). NULL = standalone course. Used to pick a learner''s primary course.';
