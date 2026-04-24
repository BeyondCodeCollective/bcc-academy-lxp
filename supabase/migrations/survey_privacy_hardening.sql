-- Privacy hardening for public_survey_responses.
--
-- Adds:
--   * consent_version + consent_at: audit what version of the notice each
--     respondent agreed to.
--   * scheduled_deletion_at: data retention horizon (default 3 years, per
--     policy draft; adjust once legal confirms).
--   * withdrawn_at: marker set by the self-service withdrawal flow before
--     the row is purged.
-- Enables RLS on public_survey_responses (deny-by-default; the service
-- client bypasses RLS automatically, so server-side writes still work).
-- Creates admin_access_log so every super-admin read/export of survey
-- data is auditable.
--
-- Idempotent; safe to re-run.

-- 1. New columns on public_survey_responses -----------------------------------

alter table public_survey_responses
  add column if not exists consent_version text;

alter table public_survey_responses
  add column if not exists consent_at timestamptz;

alter table public_survey_responses
  add column if not exists scheduled_deletion_at timestamptz;

alter table public_survey_responses
  add column if not exists withdrawn_at timestamptz;

-- Backfill existing rows (best-effort: we didn't track consent version
-- before this migration, so stamp them as 'v0' with consent timestamped
-- at completion).
update public_survey_responses
set consent_version = coalesce(consent_version, 'v0'),
    consent_at = coalesce(consent_at, completed_at),
    scheduled_deletion_at = coalesce(
      scheduled_deletion_at,
      completed_at + interval '3 years'
    );

alter table public_survey_responses
  alter column consent_version set not null;

alter table public_survey_responses
  alter column consent_version set default 'v1';

alter table public_survey_responses
  alter column consent_at set not null;

alter table public_survey_responses
  alter column consent_at set default now();

alter table public_survey_responses
  alter column scheduled_deletion_at set not null;

alter table public_survey_responses
  alter column scheduled_deletion_at
    set default (now() + interval '3 years');

create index if not exists idx_public_survey_responses_deletion
  on public_survey_responses(scheduled_deletion_at)
  where withdrawn_at is null;

-- 2. RLS on public_survey_responses ------------------------------------------

alter table public_survey_responses enable row level security;

-- Deny-by-default: no select/insert/update/delete policies for anon or
-- authenticated roles. The service client (used by the submit + admin
-- actions) bypasses RLS, so the app keeps working. Leaking an anon key
-- no longer grants read access to this table.

-- 3. admin_access_log --------------------------------------------------------

create table if not exists admin_access_log (
  id uuid default gen_random_uuid() primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  program_id uuid references programs(id) on delete set null,
  action text not null,
  resource text not null,
  row_count integer,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_access_log_actor
  on admin_access_log(actor_user_id, created_at desc);

create index if not exists idx_admin_access_log_resource
  on admin_access_log(resource, created_at desc);

alter table admin_access_log enable row level security;

-- No policies — service client writes, super-admin UI reads via server
-- actions that use the service client. Leave direct client-side access
-- closed.

-- 4. Retention job (optional; enable after legal confirms horizon) -----------
--
-- Supabase supports pg_cron. Uncomment the two statements below once the
-- retention window is finalized. They delete rows whose scheduled_deletion_at
-- has elapsed.
--
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'purge-public-survey-responses',
--   '0 4 * * *',
--   $$ delete from public_survey_responses
--      where scheduled_deletion_at < now()
--         or withdrawn_at is not null $$
-- );
