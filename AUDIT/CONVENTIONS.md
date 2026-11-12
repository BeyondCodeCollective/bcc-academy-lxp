# CONVENTIONS (draft)

Seven rules for all new code. Existing code migrates when it is next touched, hotspots first. Each rule names the check that enforces it, because a rule without a check is a preference.

## 1. Pages compose, services decide, repositories query

A `page.tsx`, `layout.tsx`, or component never calls `supabase.from(...)`. It calls a function in `src/lib/domain/<area>` which returns a plain object shaped for the screen. Only files under `src/lib/data` call `.from(...)`.

Check: ESLint `no-restricted-syntax` on `.from(` outside `src/lib/data`, with the current offenders baselined.

## 2. Every server entry point starts the same way

Every server action and route handler does three things in order: parse input from `unknown` with a schema, resolve the actor with one gate from `src/lib/auth`, then call a service passing the actor. No action accepts a user ID, role, or program ID from the client. Services take the actor and enforce tenant scope themselves.

The MVP module already does this (`src/app/dashboard/admin/mvp/attendance-actions.ts`). Copy it.

Check: a unit test per action file that calls each export with no session and expects a refusal.

## 3. The service-role client is for jobs, not for requests

Request-path reads use the user-scoped client so RLS applies. `createServiceClient` is allowed in cron routes, webhooks, and named admin write services, and each use carries a one-line comment saying why RLS cannot serve.

Check: ESLint restricted import of `createServiceClient` outside an allowlist of folders.

## 4. One tenant, read from the database

Nothing in `src` compares a program slug to a string literal, and no brand name, domain, color, sender address, or time zone is written inline. Behavior differences are feature flags on the tenant record. Brand values come from tenant config and CSS variables.

Check: grep gate in CI for `slug === "` and for the production domain literal outside `src/lib/platform/tenant`.

## 5. Time goes through one module

No `new Date()` formatting, `toLocaleString`, or time zone literal outside `src/lib/platform/time.ts`. That module takes the tenant time zone and exposes the handful of operations the product needs: session day, join window, display date, display time.

Check: ESLint restricted syntax for `toLocale*String` and for the string `"America/New_York"`.

## 6. Integrations fail loudly and recoverably

Every outbound call goes through an adapter in `src/lib/integrations/<name>` that sets a timeout, retries once where the call is idempotent, and on failure writes a row to `integration_failures` and reports to the error tracker. No bare `fetch` to a third party elsewhere. No `catch {}` without either a rethrow or a `logError` call. Webhooks and cron routes refuse to run in production when their secret is missing.

Check: ESLint `no-empty` with `allowEmptyCatch: false`; restricted global `fetch` outside adapters; Sentinel reads `integration_failures`.

## 7. Schema changes are timestamped migrations, and types are generated

One migration file per change, named `YYYYMMDDHHMMSS_description.sql`, applied through the Supabase CLI, never pasted into the SQL editor. Every new table ships with RLS enabled, its policies, and `program_id` in its primary or unique key. After each migration, regenerate the database types and commit them. A fresh database built from migrations plus the seed must boot the app.

Check: CI job that runs migrations from zero against a local Supabase and then runs the RLS test suite.

## Smaller standing rules

- UI: use the primitives in `src/components/ui.tsx`. No raw `<button>`, `<input>`, or `<select>` in new code; no `text-[Npx]`; no hex literals in `.tsx`.
- Icons: Phosphor only.
- Vocabulary: organization, course, session, cohort, enrollment. Old column names (`track_slug`, `week_number`) stay in the data layer and nowhere else.
- Files: split at 400 lines. A client component over 400 lines needs a reason in the PR.
- Deletes: hide or archive with one mechanism (`archived_at`), never a hard delete for anything with learner data.
- Tests: any change to auth, enrollment, attendance, or certificates ships with a test.
