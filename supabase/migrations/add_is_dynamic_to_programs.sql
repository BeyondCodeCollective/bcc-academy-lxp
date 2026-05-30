-- supabase/migrations/add_is_dynamic_to_programs.sql
-- Enables the course builder to create programs without a TS config file.
-- name: display name for DB-created programs (null = legacy hardcoded program).
-- is_dynamic: true means this program was created via the course builder and
--             its ProgramConfig is built entirely from DB rows at runtime.

alter table programs add column if not exists name text;
alter table programs add column if not exists is_dynamic boolean not null default false;

comment on column programs.name is 'Display name for DB-created (is_dynamic=true) programs.';
comment on column programs.is_dynamic is 'True for programs created via the course builder. False for legacy TS-config programs.';
