-- One-click, long-lived cohort invites.
--
-- A super-admin generates one row per allowlisted email; the invite email
-- links to /invite/<token>. Clicking it mints a FRESH magic-link session on
-- the spot, so the link never hits the 1-hour magic-link expiry — it works
-- whenever the student opens their email. This is the durable fix for the
-- "invite went to spam / link expired" problem.
create table if not exists public.invites (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique,
  email        text not null,
  track_slug   text not null,
  program_slug text not null,
  status       text not null default 'pending', -- pending | sent | failed
  error        text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  used_at      timestamptz
);

create index if not exists invites_email_idx on public.invites (lower(email));
-- One invite per email per track, so re-running "send invites" updates rather
-- than duplicates.
create unique index if not exists invites_email_track_idx
  on public.invites (lower(email), track_slug);

-- Server-only: every read/write goes through the service role (the admin
-- send action and the /invite route). RLS on with no policies = no client access.
alter table public.invites enable row level security;
