-- Per-program resources: a flexible, admin-editable list of "anything" —
-- tools, materials, links, docs, contacts. Rendered on /dashboard/resources,
-- scoped to the learner's current program. Writes go through the admin
-- (service role); reads are open to authenticated users.
--
-- A legacy, empty `resources` table (keyed by cohort_id) already existed in
-- some environments, so this migration is written idempotently: create the
-- base table if missing, then add the columns this feature needs.

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid,
  title text not null,
  description text,
  category text,
  url text,
  created_at timestamptz not null default now()
);

alter table resources add column if not exists program_id uuid references programs(id) on delete cascade;
alter table resources add column if not exists icon text;
alter table resources add column if not exists sort_order int not null default 0;
alter table resources add column if not exists updated_at timestamptz not null default now();
alter table resources add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table resources alter column cohort_id drop not null;

create index if not exists resources_program_idx on resources (program_id);

alter table resources enable row level security;

-- Any signed-in user may read; writes happen server-side via the service role.
drop policy if exists "Authenticated can read resources" on resources;
create policy "Authenticated can read resources"
  on resources for select
  to authenticated
  using (true);
