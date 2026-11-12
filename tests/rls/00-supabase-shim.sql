-- Minimal Supabase environment for a plain local PostgreSQL. SHIM, not the real Supabase stack.
-- Cluster-level roles are created only if missing and are never altered or dropped.
do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin nologin; end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
-- pg_cron / pg_net: NOT available locally. cron.schedule is stubbed as a no-op (see below).
-- Supabase puts extensions on the default search_path; so do we (set at DB level by setup.sh).

create schema if not exists auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid,
  aud text default 'authenticated',
  role text default 'authenticated',
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create or replace function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create or replace function auth.role() returns text language sql stable as
$$ select nullif(auth.jwt() ->> 'role', '') $$;
create or replace function auth.email() returns text language sql stable as
$$ select nullif(auth.jwt() ->> 'email', '') $$;

create schema if not exists storage;
create table storage.buckets (
  id text primary key, name text not null unique, owner uuid,
  public boolean default false, file_size_limit bigint, allowed_mime_types text[],
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, metadata jsonb, path_tokens text[] generated always as (string_to_array(name,'/')) stored,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as
$$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;

create schema if not exists cron;
create or replace function cron.schedule(job_name text, schedule text, command text) returns bigint
  language sql as $$ select 0::bigint $$;
create or replace function cron.schedule(schedule text, command text) returns bigint
  language sql as $$ select 0::bigint $$;

-- Supabase-style grants: broad GRANTs so that RLS (not privileges) is the thing under test.
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt(), auth.email() to anon, authenticated, service_role;
grant select on auth.users to service_role;
grant select, insert, update, delete on storage.buckets, storage.objects to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
