# Audit mission (remaining phases)

Phases 1 and 2.5 are done; see `progress.md`, `00-map.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`. This file holds the owner's brief for the rest, verbatim apart from the branch date.

MISSION
Overnight audit of bcc-academy-lxp (Next.js, Supabase, Tailwind, Vercel). Goal: find dead/old code, test everything live, report. Work autonomously until done. Don't stop to ask questions; log assumptions and move on.

RULES (hard)
- Work on branch `audit/overnight-20261112`. Never touch main. Never push to main/merge.
- Never run against prod DB, prod Supabase, or prod Vercel. Use local/dev/preview + test data only.
- Never send real email, hit real Mailchimp/Salesforce/Zoom/Hivebrite APIs. Mock or stub them.
- No secrets in logs/commits/report.
- No destructive migrations. No force push.
- Commit small, often. Each deletion = its own commit with reason in the message so it's revertable.

PHASE 2 - DEAD CODE
- Find unused: files, exports, components, routes, API endpoints, deps, env vars, CSS, DB tables/columns, old Eventbrite/Hivebrite/WordPress remnants, superseded UI from the Sept 2026 redesign (old dashboard/course/session layouts).
- Tools: knip, ts-prune, depcheck, eslint unused, grep for imports + route references, git log for last-touched dates.
- Classify each: DELETE-SAFE (zero refs, not reachable, tests pass without it) / LIKELY-DEAD (needs human) / KEEP.
- Delete only DELETE-SAFE with proof (refs=0, build+tests green after). Everything else: list only.

PHASE 3 - STATIC CHECKS
- tsc --noEmit, eslint, prettier check, next build, npm audit, circular deps, bundle size.
- Fix trivial errors. Log the rest.

PHASE 4 - TESTS
- Run existing tests. Note failing/flaky/skipped/obsolete.
- Write missing tests for critical paths: auth, enrollment/registration, seat saving, session join, attendance tracking, calendar/list schedule, preview-as-student mode, admin flows, webhooks, API routes, RLS policies (student can't see other students' data; role escalation checks).
- Playwright e2e on local dev: full student journey + instructor + admin, desktop + mobile viewport. Screenshots on failure.
- Edge cases: empty states, pre-start vs running course states, timezones/DST, double-submit, expired session, no-seat, full cohort.
- Check a11y (axe) and Lighthouse on main pages.

PHASE 5 - SECURITY/DATA
- Exposed keys, unauthenticated API routes, missing RLS, unsafe server actions, unvalidated input, PII in logs.

PHASE 6 - REPORT (write to AUDIT/REPORT.md, also top summary in chat)
Format, terse:
1. TL;DR: counts (deleted, flagged, bugs, tests added, pass/fail).
2. BROKEN (P0/P1/P2): file:line, repro, suggested fix.
3. DELETED: list + commit SHA.
4. NEEDS MY DECISION: flagged dead code w/ evidence + risk.
5. Test coverage gaps remaining.
6. Security findings.
7. Suggested next PRs (small, ordered).

BUDGET / RESUME
- Usage is limited. Prefer cheap ops: grep/knip/tsc over reading whole files. Don't re-read files already mapped.
- Write AUDIT/progress.md after each phase: done, in-progress, next. If restarted, read it and continue; never redo finished phases.
- Order of value if budget runs short: 2 dead code report > 4 tests on critical paths > 3 static > rest.
- Subagents: use Sonnet for Phases 2-5 workers.

Open a single draft PR from the audit branch. Do not merge.

If blocked on a phase >30 min, skip, log why, continue. Keep a running AUDIT/progress.md with timestamps.
