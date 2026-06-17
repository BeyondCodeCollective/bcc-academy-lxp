-- Reversible per-course hide flag. Works for ANY course (hardcoded TS-config
-- tracks AND DB/builder courses) since it keys by (program_slug, track_slug)
-- rather than depending on a track_overrides row existing. Hidden courses are
-- filtered out of the admin home + catalog but never deleted.
create table if not exists public.hidden_courses (
  program_slug text not null,
  track_slug   text not null,
  hidden_at    timestamptz not null default now(),
  hidden_by    uuid references auth.users(id) on delete set null,
  primary key (program_slug, track_slug)
);

-- Server actions use the service-role client, so no public policies are needed.
-- RLS on with zero policies = locked to service role only.
alter table public.hidden_courses enable row level security;
