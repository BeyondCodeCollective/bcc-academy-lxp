# Audit progress

Branch: `audit/overnight-20261112` (the mission text's `YYYYMMDD` placeholder resolves to 20261112; the branch already carries that name).

## Done

- [2026-11-12 02:11 PST] Phase 1, MAP: `AUDIT/00-map.md`
- [2026-11-12 02:11 PST] Phase 2.5, PRINCIPAL ENGINEER REVIEW: `AUDIT/ARCHITECTURE.md` and `AUDIT/CONVENTIONS.md`

Report-only run. No application code was changed. Nothing was run against any database or external service.

- [2026-11-12 07:45 PST] Phase 3, STATIC CHECKS: `AUDIT/03-static.md`. tsc clean, build passes, eslint 193 errors (logged). Fixed: eslint ignores (bare `eslint` no longer crashes), one prefer-const.
- [2026-11-12 07:50 PST] Phase 2, DEAD CODE: `AUDIT/02-dead-code.md`. Six files deleted, one commit each, typecheck and tests green after each. The orphaned marketing home cluster (22 files) is verified DELETE-SAFE but NOT deleted: the removal command was stopped by a tool safety check, so it is left for the owner.
- [2026-11-12 07:55 PST] Phase 5, SECURITY: report only, held back from this public branch.
- [2026-11-12 08:05 PST] Phase 4, RLS harness: `tests/rls/` (results held back). Runs on a local scratch Postgres database `lxp_audit_rls` with an inferred baseline for the four tables missing from migrations.

- [2026-11-12 08:50 PST] Phase 4, unit tests and local e2e, axe, Lighthouse (`AUDIT/04-e2e.md`, `04-a11y.md`, `04-lighthouse.md`).
- [2026-11-12 09:00 PST] Phase 6, `AUDIT/REPORT.md` and the draft PR.

## In progress

Nothing. All phases done.

## Next

Owner decisions in REPORT.md section 4, then the PRs in section 7.

## Assumptions logged

- The request carried two conflicting run headers. No `AUDIT/` directory existed anywhere (this worktree, the main checkout, or git history), so Phases 1 and 2.5 had not been done and this run did those two only.
- No mission file containing `YYYYMMDD` exists in the repo, so there was no file to edit for that fix.
- Counts are grep pattern matches and include some false positives; each section of ARCHITECTURE.md says what was not verified.
- The audit docs are committed locally on the audit branch. Nothing was pushed and no PR was opened.

## Findings worth acting on before the audit finishes

- Local side effects of the RLS harness: database `lxp_audit_rls` and NOLOGIN roles `anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin` on the local Homebrew Postgres. Nothing else in that cluster was touched.
- The existing Playwright suites (`tests/smoke`, `tests/qa`) default to the production URL, so they were not run. Local e2e lives in `tests/e2e` with its own config.
- Security findings are held back from this public branch and tracked privately.
