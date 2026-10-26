-- Per-event switch for optional registration questions. Holds the keys of the
-- questions turned OFF, so the default (empty) keeps every existing event
-- exactly as it was. Idempotent; safe to re-run.
alter table public.events
  add column if not exists hidden_questions text[] not null default '{}';
