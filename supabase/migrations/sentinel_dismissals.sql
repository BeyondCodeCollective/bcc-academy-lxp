-- Dismissed Sentinel findings. Platform Health lists rules that broke in
-- production once, but some findings are permanent facts of legacy data — a
-- retired course that will always have learners on it, a certificate issued
-- before enrollments were tracked. There was no way to say "acknowledged,
-- won't fix", so the unfixable rows crowded out the ones that need action and
-- the nightly brief re-reported them every morning.
--
-- Dismissal is per ROW, keyed by a stable identity the check computes
-- (`row_key`) rather than by the rendered label — labels embed live counts
-- ("3 session(s) held"), so keying on them would un-dismiss the row the moment
-- a number moved. New rows under an already-dismissed check still surface: a
-- won't-fix must never mask a real regression.
--
-- Additive + idempotent. Service-client reads/writes only (RLS on, no policy).

create table if not exists sentinel_dismissals (
  id uuid default gen_random_uuid() primary key,
  check_name text not null,
  row_key text not null,
  -- The label as it read when dismissed, so the "Dismissed" list is legible
  -- without re-running the check.
  row_label text not null,
  note text,
  dismissed_by uuid references auth.users(id) on delete set null,
  dismissed_by_email text,
  created_at timestamptz not null default now(),
  unique (check_name, row_key)
);

create index if not exists sentinel_dismissals_check_idx
  on sentinel_dismissals (check_name);

alter table sentinel_dismissals enable row level security;
-- No policy: only the service client (which bypasses RLS) reads/writes this.
