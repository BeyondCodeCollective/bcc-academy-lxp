# RLS test harness

Local, reproducible row level security tests for the BCC LXP. Plain `psql` and bash, local PostgreSQL only
(no Docker, no Supabase CLI, no network, no remote project).

## Run

```sh
tests/rls/setup.sh   # drops and recreates ONLY database lxp_audit_rls, applies shim, baseline, migrations, seed
tests/rls/run.sh     # runs tests/*.sql as anon / authenticated users, prints PASS/FAIL/INFO, exits 1 on any FAIL
```

Needs a superuser-capable local `psql -d postgres` (Homebrew PostgreSQL 18 was used). `setup.sh` creates the roles
`anon`, `authenticated`, `service_role` (BYPASSRLS), `authenticator`, `supabase_admin` only if missing and never
alters or drops existing roles or databases.

## Files

- `00-supabase-shim.sql`: roles, `auth.users`, `auth.uid()/role()/jwt()/email()` (read `request.jwt.claims`), `storage.buckets/objects`
  stubs, `extensions` schema, a no-op `cron.schedule`, Supabase-style default grants (so RLS, not GRANTs, is what is tested).
  `pg_cron` and `pg_net` are not available locally and are stubbed or skipped.
- `01-baseline.sql`: INFERRED CREATE TABLEs for tables the migrations alter but never create (`students`, `cohorts`,
  `track_features`, `sessions`). Not the production schema. Column provenance is commented per column.
- `setup.sh`: applies migrations in git first-add order (filenames without timestamps are not in dependency order),
  retrying failures until a pass makes no progress, one transaction per file. Has an explicit SKIP list and a PATCH list
  (in-memory sed; repo files are never modified).
- `seed.sql`: programs A and B, S1/S2/I1/AD1 in A, S3/AD2 in B, with data in the learner tables. All `@example.test`.
- `lib.sql`: helper schema `rlstest` (impersonation, `try()` that always rolls back, counters). Loaded by `run.sh`.
- `tests/*.sql`: the assertion files. Not in this public branch yet; `run.sh` has nothing to run until they land.

## Reading results

`PASS`/`FAIL` are assertions; `INFO` lines are facts worth knowing, not counted. A FAIL is a finding about the
policies as written in migrations, not something the harness fixes. Insert checks treat sqlstate 42501 as "denied";
any other outcome means RLS let the row reach constraint checks or be inserted.

## Limits

- Production schema was hand-built, so production may differ from migrations. The four baseline tables are guesses:
  RLS state and policies on them in production are not derivable from the repo, so results on them are baseline
  artifacts, not prod facts.
- Replay order is reconstructed from git history; real production order may differ.
- Storage policies are only checked for literal-true quals; bucket behaviour is not exercised.
- Service-key paths (which bypass RLS and carry most app reads/writes) are out of scope.
- Fixed UUIDs, tiny data; no performance or concurrency testing.
