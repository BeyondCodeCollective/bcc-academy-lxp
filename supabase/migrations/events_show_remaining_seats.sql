-- Per-event switch for the public "N spots left" counts. Defaults on, so
-- existing events behave exactly as before. Idempotent; safe to re-run.
alter table public.events
  add column if not exists show_remaining_seats boolean not null default true;
