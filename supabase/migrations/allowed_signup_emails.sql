-- Per-program signup allowlist. When `requireAllowlist` is true on a
-- ProgramConfig, the /join/[slug] action rejects any email that doesn't
-- have a row here for that program_slug. Admins manage entries through
-- /dashboard/admin/allowlist (paste or CSV upload).
--
-- The PK is (email, program_slug) so the same email can be on multiple
-- program allowlists. All reads/writes happen via the service client from
-- server actions; RLS denies anon access entirely.

create table if not exists allowed_signup_emails (
  email text not null,
  program_slug text not null,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null,
  primary key (email, program_slug)
);

create index if not exists allowed_signup_emails_program_idx
  on allowed_signup_emails (program_slug);

alter table allowed_signup_emails enable row level security;

-- No public policies — only the service client (admin actions) touches
-- this table. Anon and authenticated roles are denied by default.
