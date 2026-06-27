# Security Audit — BCC Academy LXP — 2026-06-25

## Summary
- **Total findings**: 19 (P0: 2, P1: 1, P2: 7, P3: 9)
- **Overall risk**: **Critical** — two unauthenticated paths log an attacker in as another user.
- **Layers run**: 1 source · 2 deps · 3 secrets · 4 config · 5 DB/advisor (live, read-only). DAST (ZAP) skipped — see below.
- **Project**: Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · Vercel. Prod DB: `qrtvbclbrumsrwbugvrr` (East).
- **Method**: 2 parallel source-review agents (every API route + all 24 server actions), `pnpm audit`, `gitleaks` (working tree + full history), migration RLS sweep, and the live Supabase security advisor.

---

## Findings

### [P0-001] `eventbrite_orders` has RLS disabled → invite tokens readable with the public anon key — Critical
- **Layer**: DB config (confirmed live)
- **Location**: `supabase/migrations/eventbrite_funnel.sql:21` (table created, RLS never enabled); live advisor: `rls_disabled_in_public` **ERROR**, EXTERNAL-facing, on `public.eventbrite_orders`.
- **Confidence**: High
- **Issue**: The table stores `email` + `invite_token` per registrant and has **no RLS and no policies**. Supabase exposes every `public`-schema table through PostgREST; with RLS off, the `anon` role (whose key ships in the browser bundle) can `SELECT *`.
- **Impact**: Anyone can call `GET https://<project>.supabase.co/rest/v1/eventbrite_orders?select=email,invite_token` with the public anon key, harvest **every** registrant's durable `invite_token`, then visit `/invite/<token>` to be logged in as that person. Mass account takeover — no order-id guessing required. Target population includes BGC youth.
- **Evidence**: advisor lint `rls_disabled_in_public_public_eventbrite_orders` (level ERROR); `invites` table by contrast has RLS-on/deny-by-default, so the token is only exposed via this table.
- **Fix** (one migration — needs your go-ahead to apply to prod):
  ```sql
  alter table public.eventbrite_orders enable row level security;
  -- no policies = deny-by-default; the service client (used by the funnel) bypasses RLS and keeps working.
  ```
- **Effort**: minutes

### [P0-002] Eventbrite `claim` is an account-takeover oracle — Critical
- **Layer**: source
- **Location**: `src/app/api/eventbrite/claim/route.ts:46-54` → `src/lib/eventbrite-funnel.ts:48-54` → `src/app/invite/[token]/route.ts:38-64`
- **Confidence**: High (verified by reading the full chain)
- **Issue**: `POST /api/eventbrite/claim` takes an attacker-supplied `orderId`, resolves the buyer's email via the server's private Eventbrite token, and **returns `{ redirectUrl: "${origin}/invite/<token>" }`**. `GET /invite/<token>` then mints a fresh Supabase magic link for the order's email and logs the visitor in as that buyer.
- **Impact**: Eventbrite order IDs are ~10-digit, roughly sequential, and leak on receipts/forwarded confirmations. An attacker submits a victim's order id and receives a working login-as-victim URL. Only gate is an in-memory 8/min/IP limit (bypassable by IP rotation).
- **Evidence**: `claim/route.ts:52-54` returns the token; `invite/[token]/route.ts:42-46,64` calls `generateLink({type:'magiclink'})` and redirects to `/auth/callback` with the `token_hash`.
- **Fix**: Never return a login-bearing invite URL from a request keyed only on an order id. Have `claim` return `{ ok: true }` and deliver the `/invite/<token>` link **only** via the confirmation email already sent to `order.email`. (The `order.placed` webhook already provisions reliably, so the client claim doesn't need to echo the token.)
- **Effort**: ~1 hour

### [P1-001] Cross-program authz gap — admin actions trust a client-supplied `programSlug` — High
- **Layer**: source
- **Location**: `actions-shared.ts:9-39` (`requireAdmin`/`requireManager` check capability but ignore which program is targeted) + call sites that re-resolve the client `programSlug`: `actions-misc.ts:37 getAllSubmissions`, `:90 getAllReflections`, `:142 createAnnouncement`, `:214 grantCompletion`, `:248 revokeCompletion`; `actions-surveys.ts:60 exportSurveyResponses`, `:34 getSurveyStats`, `:278 listPublicSurveyResponses`, `:424 deleteSurveyResponse`, `:924 getTrackSurveyResponses`; `actions-tracks.ts:38/56/76/151/298`; `actions-students.ts:28/38`.
- **Confidence**: High (verified `getAllSubmissions`: queries `.eq("program_id", programRow.id)` from the client slug, never compared to the actor's `programId`)
- **Issue**: `requireAdmin` resolves to `access_admin_panel` — which **includes `instructor`** — and returns the caller's own `programId`, but the actions then operate on the program named in the argument. The service client bypasses RLS, so there's no backstop.
- **Impact**: A program-A instructor/admin calls e.g. `exportSurveyResponses("forte", …)` or `getAllSubmissions("catalyst")` and reads another org's student names, emails, survey answers, and submitted work. Write siblings (`grantCompletion`, `deleteStudentAction`, `saveTrackOverview`, `createAnnouncement`) let them tamper across tenants.
- **Evidence**: The correct pattern already exists — `resolveInsightsScope()` (`actions-surveys.ts:16-24`) hard-scopes non-super-admins to their own program — it just wasn't applied to these actions.
- **Fix**: After `requireAdmin()`, for non-`canSwitchPrograms` actors assert `programIdFromSlug(programSlug) === programId`; for `studentId`-keyed actions, load the target's `program_id` and compare.
- **Effort**: a few hours (one shared guard, applied at each call site)

### [P2-001] Workshops index leaks internal Lunch & Learn recordings to any student
- **Layer**: source — `src/app/dashboard/workshops/page.tsx:16-29`
- **Issue**: Page gates only on `if (!currentUser)`, then service-client-reads all `lunch_learns` (incl. `recording_url`) and renders them. The detail page (`lunch-learn/[id]/page.tsx:19`) correctly uses `canAccessStaffContent(role,email)`; the index doesn't.
- **Impact**: Any regular student visiting `/dashboard/workshops` sees every internal staff recording link.
- **Fix**: Add `canAccessStaffContent(role,email)` before querying `lunch_learns`.

### [P2-002] `lunch_learns` is directly writable/deletable by any authenticated user
- **Layer**: DB (advisor WARN ×3, `rls_policy_always_true`) — `supabase/migrations/lunch_learns.sql:33-46`
- **Issue**: INSERT/UPDATE/DELETE policies are `to authenticated … with check (true)` / `using (true)`. The intended admin check lives only in server actions, but PostgREST exposes the table directly — any signed-in student can `POST/PATCH/DELETE /rest/v1/lunch_learns` with their own JWT.
- **Impact**: A student can delete/alter staff recordings or inject an arbitrary `recording_url` (phishing).
- **Fix**: Replace the `(true)` write policies with role-scoped ones (or restrict writes to the service client and drop the authenticated write policies entirely).

### [P2-003] IDOR in `getFeedback` — read another student's instructor feedback
- **Layer**: source — `src/app/dashboard/track/actions.ts:279-318`
- **Issue**: Only `requireAuth()`; reads `submission_feedback` by caller-supplied `submission_id`/`reflection_id` with no ownership check (every other read in the file scopes by `student_id`).
- **Impact**: A logged-in student supplies another student's submission UUID and reads private instructor feedback. (Mitigation: UUID must be obtained/guessed.)
- **Fix**: Verify the parent submission/reflection has `student_id = userId` before returning.

### [P2-004] Reflected XSS on the app origin via `zoom-frame`
- **Layer**: source — `src/app/api/zoom-frame/route.ts:117,132,140-141`
- **Issue**: Unauthenticated. `mn`/`pwd` query params are interpolated into an inline `<script>` via `JSON.stringify`, which does **not** neutralize `</script>`.
- **Impact**: `GET /api/zoom-frame?mn=</script><img src=x onerror=…>` runs attacker JS on the app's own origin in a victim's browser (drives authed `/api/*` calls, exfiltrates session data).
- **Fix**: Sanitize `mn` to digits (`replace(/\D/g,"")`, as `zoom-signature` already does) and `pwd` to an allowlist; escape `<` as `<` in any inline-script string. Consider requiring auth.

### [P2-005] Public `session-files` bucket allows listing + upload has no content-type allowlist
- **Layer**: DB advisor (`public_bucket_allows_listing`) + source (`src/app/api/upload/route.ts:78-89`)
- **Issue**: The public bucket has a broad SELECT policy on `storage.objects` → clients can **list** every file; uploads (admin-only, 50 MB cap, path-safe) accept any content type and are served with the client-supplied `file.type` (HTML/SVG → stored XSS on the storage domain).
- **Impact**: Enumeration of all uploaded student files; stored-XSS payloads hosted on the Supabase domain.
- **Fix**: Drop the broad bucket SELECT/list policy (object URLs still work); allowlist upload content types or force `application/octet-stream` for non-media.

### [P2-006] Chromium browser profile (Cookies / Login Data) committed to git history
- **Layer**: secrets — `scripts/circle-export/.playwright-state/Default/{Cookies,Login Data,Login Data For Account,Account Web Data}` (+journals), added in history; removed from the working tree but **present in 2686-commit history** (also ~3.75 GB of bloat).
- **Issue**: A Playwright/Chromium profile used to scrape Circle was committed. The dir is **not** in `.gitignore`, so `circle-export` could re-commit it. (The 438 gitleaks hits in this dir are browser-pref hashes — false positives — but the SQLite credential stores are the real concern; gitleaks didn't parse them.)
- **Impact**: Circle session cookies / saved logins in history. **Mitigation**: Chromium encrypts these with an OS-keychain key absent from the repo, so off-host decryption is likely infeasible — defense-in-depth + hygiene issue rather than an immediately live credential leak.
- **Fix**: Add `scripts/circle-export/.playwright-state/` to `.gitignore`; rotate the Circle account's password/session to be safe; optionally purge from history (`git filter-repo`) to reclaim 3.75 GB. Coordinate history rewrite with anyone who has clones.

### [P2-007] High-severity CVE: `ws` DoS via `@supabase/realtime-js`
- **Layer**: deps — `ws >=8.0.0 <8.20.1` (path `@supabase/supabase-js > @supabase/realtime-js > ws`), GHSA-58qx-3vcg-4xpx.
- **Fix**: Bump `@supabase/supabase-js` to pull `ws >= 8.20.1` (or add a pnpm `overrides` pin). Verify with `pnpm audit --prod`.

---

## P3 — defense-in-depth / hardening

- **[P3-01] CSP is Report-Only, not enforced** — `next.config.ts:` sets `Content-Security-Policy-Report-Only` with `script-src 'unsafe-inline' 'unsafe-eval'`. XSS (e.g. P2-004) is not blocked, only reported. Move to an enforcing `Content-Security-Policy` and remove `unsafe-inline`/`unsafe-eval` (nonce/hash the GA + Zoom inline scripts) once the report stream is clean.
- **[P3-02] `zoom-signature` mints a signature for any meeting number** — `api/zoom-signature/route.ts:75-118`. Auth + pending-gate present, but `meetingNumber` isn't checked against the learner's enrollment. Bounded (still needs the meeting password). Fix: validate against enrolled tracks' meetings.
- **[P3-03] `attendance` GET cross-program IDOR for admins** — `api/attendance/route.ts:160-162`. POST/DELETE cross-check program; GET admin branch doesn't. Scope GET to the admin's program. (Same root cause as P1-001.)
- **[P3-04] Latent unauthenticated server actions** — `getSurveyStats`, `getStudentTracks`, `getInstructorTracks`, `getActiveAnnouncements` are exported from `"use server"` files with no auth and currently no importers (dead). Delete or add `requireAdmin()`.
- **[P3-05] Demo bypass keys off env presence, not `NODE_ENV`** — `current-user.ts:21`, `dashboard/layout.tsx:321`. Not exploitable today (prod has Supabase vars), but if those vars ever vanished, prod would honor the plaintext `DEMO_COOKIE` → `super_admin`. Add `&& process.env.NODE_ENV !== "production"`.
- **[P3-06] `lunch-learn/actions.ts` guard omits the preview-mode block** — defines its own `requireCapability` that skips `isPreviewingAsStudent`, violating the "preview must be a real restriction" rule. Use the shared `requireAdmin`.
- **[P3-07] `warm` host-header SSRF** — `api/warm/route.ts:48-53`. When `CRON_SECRET` is unset, fan-out fetch targets `${Host header}/api/warm-eu`. No creds leak. Build the URL from a trusted env value.
- **[P3-08] Leaked-password protection disabled** — Supabase Auth advisor WARN. Enable HaveIBeenPwned check in Auth settings.
- **[P3-09] Moderate/low CVEs** — `uuid <11.1.1` (via `resend>svix`) and `@babel/core <=7.29.0` (via `next>styled-jsx`, dev/build only). Bump on next dependency pass.

---

## Verified Safe (explicitly checked)

- **DEMO_COOKIE is NOT a production bypass** — honored only when `!isSupabaseConfigured()` (`current-user.ts:21-37`, `dashboard/layout.tsx:321-333`); prod always has the vars. `/api/dev-login` is hard-gated to `NODE_ENV==='development'`.
- **Role/capability core** (`roles.ts`, `auth/admins.ts`) — `master` is email-gated (never a DB role, not self-grantable); `canAssignRole`/`assignableRoles` correctly block elevating self/anyone to/above the actor's tier; only a master grants `super_admin`.
- **Preview-as-student is a real restriction** — `requireCapability` throws under preview; admin layout redirects; progress/allowlist/invite actions re-check (except P3-06).
- **Certificate page** — public by design, keyed on `certificate_id = gen_random_uuid()` (unguessable); exposes only name + track + date.
- **Deny-by-default RLS tables** (advisor `rls_enabled_no_policy`, intentional & correct) — `invites`, `public_survey_responses`, `admin_access_log`, `allowed_signup_emails`, `hidden_courses`, `tutor_messages`. Service client bypasses; anon/auth blocked.
- **Auth callback** — no open redirect (`next` constrained to `/dashboard/apply/`; `type` allowlisted; wrong-account fallback blocked).
- **Invite / calendar tokens** — DB lookups, not string compares; invite token ≈81 bits, calendar token is `randomUUID()`.
- **`check-email` / `account-exists`** — no user enumeration (always return true, rate-limited 10/min).
- **Eventbrite webhook** — constant-time secret check, idempotent, rate-limited (but leaving `EVENTBRITE_WEBHOOK_SECRET` unset is worth closing given P0-002).
- **Self-scoped learner actions** — dashboard/track/settings/assessment/onboarding actions all key to `user.id`.
- **Secrets** — no application secrets in the working tree or git history (gitleaks: the only history hits are 438 false-positive browser-pref hashes in the committed Playwright profile, P2-006). `.env*` and `*.pem` are gitignored; no `.env` tracked.
- **Security headers** — HSTS (preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` all set; `images.remotePatterns` is an allowlist (no `**`).

---

## Skipped / Needs verification
- **DAST (OWASP ZAP)** skipped — needs a staging URL you confirm is safe to scan (never prod for active scans). To run a passive baseline later:
  `docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t <staging-url> -r zap.html`

---

## Remediation plan (in order)
1. **P0-001** — `alter table public.eventbrite_orders enable row level security;` (one statement; biggest exposure, smallest fix).
2. **P0-002** — stop `claim` returning the invite URL; deliver it only by email.
3. **P1-001** — apply server-side program scoping to all program-keyed admin actions (+ fixes P3-03).
4. **P2** batch — workshops gate (P2-001), `lunch_learns` write policies (P2-002), `getFeedback` ownership (P2-003), `zoom-frame` sanitize (P2-004), bucket-list + upload allowlist (P2-005), `.gitignore` + rotate Circle session (P2-006), bump `ws` (P2-007).
5. **P3** batch — CSP enforce, dead-action cleanup, demo-cookie NODE_ENV guard, remaining CVEs.
</content>
</invoke>
