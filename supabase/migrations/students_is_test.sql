-- Marks internal/QA accounts (Fonz's test logins) so they can be excluded from
-- analytics without deleting them — keeping the test logins usable for QA while
-- keeping learner-facing numbers honest.
--
-- Analytics surfaces (Engagement funnel, Acquisition & Risk) filter is_test out.
-- Default false so every real learner is counted; only the accounts we flag by
-- hand are hidden.

alter table students
  add column if not exists is_test boolean not null default false;

comment on column students.is_test is
  'Internal/QA account — excluded from all learner analytics. Not a real learner.';
