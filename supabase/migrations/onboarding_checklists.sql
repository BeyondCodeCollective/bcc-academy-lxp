-- Admin-editable onboarding checklists, one row per course (track). A row
-- replaces the checklist hardcoded in src/lib/onboarding/checklists.ts for that
-- course; no row means the hardcoded one (or none) still applies. `config`
-- holds title, intro, copy, agreement settings and the ordered items, which may
-- include custom forms. Service-role only, like the other admin config tables.
-- Idempotent; safe to re-run.
create table if not exists public.onboarding_checklists (
  track_slug text primary key,
  program_id uuid references public.programs(id) on delete set null,
  config jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.onboarding_checklists enable row level security;
