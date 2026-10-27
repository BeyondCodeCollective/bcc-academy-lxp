-- Per-application switch for questions. Holds the ids of questions turned OFF
-- (hidden from the public form, kept in `questions` so past answers still
-- read). Default empty = every existing application is unchanged. Idempotent.
alter table public.applications
  add column if not exists hidden_questions text[] not null default '{}';
