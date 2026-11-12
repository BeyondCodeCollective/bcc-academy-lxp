# Audit report

Branch `audit/overnight-20261112`, 2026-11-12. Nothing ran against production, a hosted Supabase project, real email, or any third-party API. Detail lives in the per-phase files: `02-dead-code.md`, `03-static.md`, `04-e2e.md`, `04-a11y.md`, `04-lighthouse.md`. Sections 2 and 6, and the phase files behind them, are held back from this public branch and tracked privately.

## 1. TL;DR

| | Count |
|---|---|
| Deleted | 28 files and 1 devDependency, 8 commits |
| Flagged dead, needs a decision | about 22 items |
| Unit tests added | 18 files on critical paths |
| RLS harness added | Local scratch database scaffolding in `tests/rls` (test files held back) |
| E2E added | Local Playwright suite, desktop and mobile viewports, all pass |
| Static | tsc pass, build pass, eslint 193 errors |

## 2. BROKEN

Held back from this public branch; tracked privately.

## 3. DELETED

Each is its own commit. Typecheck and unit tests were green after each, and the production build passes at the end.

| Commit | Removed |
|---|---|
| `b84b7e39` | `src/lib/course-summary.ts` |
| `60b4aa80` | `src/components/copy-invite-link.tsx` |
| `bc05a659` | `src/app/dashboard/admin/allowlist/allowlist-form.tsx` |
| `f6f46007` | `src/app/dashboard/admin/allowlist/track-picker.tsx` |
| `c1c755b4` | `src/app/dashboard/admin/invites/invites-panel.tsx` |
| `d79a5837` | `src/app/dashboard/admin/surveys/unified-surveys-dashboard.tsx` |
| `75c6ba66` | devDependency `@anthropic-ai/sdk` |
| `9f167bd0` | Old marketing home: `MarketingHome.tsx`, 17 section components, `src/lib/marketing-motion.ts`, `src/data/marketing/{facilitators,hubs,sessions}.ts` (22 files, owner approved) |

Other changes: `660ec554` adds ESLint ignores so bare `eslint` finishes in 11 seconds and no longer crashes the heap, plus one `prefer-const`. `.gitignore` gained `tests/e2e/test-results/`.

## 4. NEEDS MY DECISION

Also verified unused, left in place as low value: `.scrollbar-hide` in `globals.css`, six color tokens, 31 exported symbols and 6 types (lists in `02-dead-code.md`).

| Item | Evidence | Risk if deleted |
|---|---|---|
| `/platform`, `/platform-atlas`, `/platform-brief`, `/platform-features`, `/platform-map` | Linked only from each other, docs, one script | Funders may hold the URLs |
| Eventbrite stack (webhook, claim route, funnel lib, widget, `eventbrite_orders`) | Dormant. The widget renders only when a `landing_pages` row has `eventbrite_event_id`. Cannot tell without the database; the SQL to check is in `02-dead-code.md` | Breaks a live campaign if any row is set |
| `/api/auth/check-email`, `/api/auth/account-exists`, `/api/upload`, `/api/week-progress` | Zero callers in the repo | Low. Check production logs for hits first |
| `/api/quiz/results` | Called by the quiz, but email is switched off by a constant | Product call: ship or drop |
| `/apply/sbft` and the unused apply forms under `/apply/home-for-summer` | Pages show a closed notice; forms unused | Lose the easy reopen |
| `/assessment-preview` | No inbound link | Probably LPAT work in progress |
| Redirect shims: `/dashboard/admin/surveys/all`, `/dashboard/mass/[week]`, `/dashboard/techplus/[week]` | Zero links | Old bookmarks |
| 7 `lpat_*` tables | No code references, created 2026-10-04 | Likely work in progress |
| `archive/` (52 files), `demo/`, `learnerpathwayassessmenttoolbuildpacket/`, `qr-codes/`, two screenshots, three HTML one-sheets, a PDF, `board-meeting-script.md` at the repo root | No code or config references | Human content. Move out of the repo |
| 65 files under `public/` | No reference by name (`logs/public-unreferenced.txt`) | May be linked from emails or outside sites |
| 24 of 26 files in `scripts/` | Not wired into `package.json` | Some are ops tools |
| `AGENTS.md`, `README.md` | Point to a path that does not exist | Doc fix only |
| 35 env vars used in code but missing from `.env.local.example` | List in `02-dead-code.md` | None; add them |

Kept after checking: both Network+ exam files (both registered), `/api/warm-eu`, all cron routes, emailed and QR link targets. WordPress has zero references; Hivebrite appears only in comments and CSV import help text.

## 5. Test coverage gaps remaining

- **No reproducible schema.** `students`, `cohorts`, `track_features`, `sessions` have no `CREATE TABLE` in migrations, so the RLS harness uses an inferred baseline. A `supabase db dump --schema-only` from production, committed as the baseline, fixes this and makes the harness authoritative.
- Zoom live-join gating (session day only, retires 30 minutes after end) is inline in a page file and cannot be unit tested without extracting it.
- Not reached: attendance compute and Zoom sync, certificate issue idempotency, `recording_url` blob versus presigned handling, the calendar token feed, seat limits and full-cohort behavior.
- Only two cron routes have bearer tests; the rest share the pattern.
- E2E runs against a Supabase stub that does not scope rows per caller, so instructor scoping is checked at the UI level only. No e2e covers real sign-in, real email, Zoom, or uploads.
- The existing `tests/smoke` and `tests/qa` suites were not run: both default to the production URL.
- Lighthouse: public pages only (performance 83 to 91, accessibility 95 to 100). Logged-in dashboards were not scored. Numbers come from a local production build and are relative.

## 6. Security findings

Held back from this public branch; tracked privately.

## 7. Suggested next PRs (small, in order)

Security and dependency items are held back from this list and tracked privately.

1. Commit a production schema dump as the migration baseline; rerun `tests/rls`.
2. Move root clutter and `archive/` out of the repo; fix `AGENTS.md` and `.env.local.example`.
3. Lint cleanup: `help-center.tsx` entities, `<Link>` in `admin-tabs.tsx`; then make `pnpm lint` a required check.
4. Wire `pnpm test` plus the local Playwright suite into CI; load the tiptap editor with `dynamic()`.

## Local side effects

- Local Homebrew Postgres: database `lxp_audit_rls` and NOLOGIN roles `anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin`. Remove with `dropdb lxp_audit_rls` and `drop role` if unwanted.
- `.env.e2e.local` in the worktree (gitignored, fake values only).
