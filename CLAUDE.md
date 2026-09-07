@AGENTS.md

# BCC Academy — Learning Experience Platform

## What This Is

BCC Academy is a **Digital Learning Ecosystem**. BCC (Beyond Code Collective) is the infrastructure — programs, tracks, and learning experiences run on top of it.

The platform is built in partnership with BGC (Black Girls Code). The founder of BCC is the CEO of BGC. Both organizations serve their communities through this shared platform.

**Philosophy:** Human in the lead. We teach the future — and it includes humans and technology together. AI observes, synthesizes, and suggests; humans teach and decide.

---

## Programs

All hub programs route through **Catalyst** at `bccacademy.io`. Legacy subdomains still resolve but redirect.

| Program | Slug | Notes |
|---|---|---|
| Catalyst | `catalyst` | Unified hub at `bccacademy.io`; aggregates ATG + Beyond Code Centers ONLY |
| Beyond the Game | `atg` | Standalone, listed under the hub |
| Beyond Code Centers | `beyond-code-centers` | Standalone, listed under the hub |
| Forte | `forte` | `forte.bccacademy.io` — Upskill Bahamas; standalone, NOT aggregated |
| BGC | `bgc` | Black Girls Code; standalone, NOT aggregated |
| Dynamic orgs | (varies) | Admin-created tenants (`programs.is_dynamic`) — e.g. demo orgs; no TS config at all |

**Courses (tracks) are DB-driven.** `track_overrides` + `session_content` are the source of truth; hardcoded TS track configs are legacy. Don't add new tracks/programs to TS files — create them through the admin course builder (manual, import-from-link, or Generate with AI). Track metadata is live-editable via `track_overrides` with no deploy.

---

## Multi-Program Routing

Program detection resolves in this order:

1. Known production host → `DOMAIN_MAP` in `src/lib/programs/index.ts`
2. `program-override` cookie (super-admin switcher, overrides domain on non-prod)
3. `x-program-slug` header (set by middleware on every request)
4. `program-slug` cookie (fallback)

The apex domain resolves to a MARKETING context. Learner UX must key off **enrollment**, not the browsing program — enrolled learners hitting marketing context self-heal via `/dashboard/switch-program` (both layout AND page must agree; they render concurrently and their redirects race).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Database | Supabase (Postgres + Auth) — prod project `qrtvbclbrumsrwbugvrr` (East) |
| Hosting | Vercel (`learning-portal`, team `beyond-code-collective`) |
| Auth | Supabase Auth (magic links; `/auth/confirm` interstitial defeats Outlook Safe Links) |
| Styling | Tailwind CSS — see `DESIGN.md` for the type ramp, radii, and tokens |
| AI | Vercel AI Gateway, model string `"google/gemini-2.5-flash"` (`ai` SDK; OIDC on Vercel, `AI_GATEWAY_API_KEY` locally) |
| Email | Resend (`src/lib/email.ts`) |
| Recordings | Private Vercel Blob; store `blob:<pathname>` in `recording_url`, NEVER a presigned URL (they expire; max validity 7 days) |

---

## AI Systems (in-product)

| System | Where | What it does |
|---|---|---|
| AI Tutor | `src/app/api/tutor/route.ts` | Learner chat; opt-in per program via `tutorConfig.enabled` |
| Course import | `src/lib/course-import/parse.ts` | Paste a link/text → structured `CourseDraft` → admin review → create |
| Program Generator | `src/lib/course-import/generate.ts` | Plain-English description → full drafted course; invents curriculum, never logistics |
| Sentinel | `src/lib/sentinel/` + `/api/cron/sentinel` | Nightly self-audit: data invariants + launch-readiness checks; AI daily brief emailed (`SENTINEL_NOTIFY_EMAIL`); live view + one-click fixes at Admin → Manage → Platform health (master-only) |
| Deploy check | `/api/hooks/deploy-check` | Probes public learner journeys post-deploy; emails on failure |

New AI features follow the same pattern: gateway model string, structured output via `generateObject` where shape matters, graceful degradation when the gateway is down.

---

## Cron Jobs (vercel.json)

| Path | Schedule | Purpose |
|---|---|---|
| `/api/warm` | */5 min | Keep-warm |
| `/api/cron/zoom-attendance` | 04:00 UTC | Zoom → attendance |
| `/api/cron/daily-snapshot` | 06:00 UTC | Analytics snapshots |
| `/api/cron/sentinel` | 07:00 UTC | Nightly self-audit + brief |
| `/api/cron/zoom-recordings` | :30 hourly | Import Zoom cloud recordings → private Blob |

Auth pattern: `Authorization: Bearer <CRON_SECRET>`; no secret set = accept all (preview/local).

---

## Key Paths

```
src/lib/programs/            ← Program configs + DOMAIN_MAP (index.ts), override merging (server.ts)
src/lib/sentinel/            ← Self-audit checks + synthetic journeys
src/lib/course-import/       ← AI course parsing (parse.ts) + generation (generate.ts)
src/lib/email.ts             ← All Resend email senders
src/app/dashboard/           ← Authenticated learner portal
src/app/dashboard/admin/     ← Admin panel (role-gated)
src/app/bcc/[slug]/          ← Campaign landing pages (DB-driven via landing_pages)
src/app/apply/               ← Public application forms
src/app/survey/              ← Public surveys (no login required)
src/app/join/                ← Enrollment via invite/join link
src/components/stats/        ← Data-viz primitives (single-hue cobalt; never rainbow)
supabase/migrations/         ← DB schema history
scripts/audit-data.mjs       ← Read-only data audit (also ported into the Sentinel)
DESIGN.md                    ← Design system: type ramp (text-micro etc.), Phosphor icons (/dist/ssr in server components)
```

---

## Roles

| Role | Access |
|---|---|
| `student` | Dashboard only |
| `instructor` | Admin panel → their assigned tracks only (scoping reads `instructor_tracks`, not the instructor name text) |
| `admin` | Admin panel for their program; people management |
| `super_admin` | All programs + program switcher (view-oriented) |
| master | Email-gated tier above super_admin (`isMasterEmail`, `src/lib/auth/admins.ts`) — role management, organizations, Platform health |

Two-program staff use `staff_program_access` grants, not super_admin. "Preview as student" must be a REAL restriction — gate new admin surfaces/actions when `isPreviewingAsStudent`.

---

## Database Tables (key ones)

| Table | What it stores |
|---|---|
| `programs` | Program registry; `is_dynamic` marks admin-created orgs |
| `students` | All users — role, cohort, program, name, email, `is_staff`/`is_test` |
| `track_overrides` | THE course record (DB-driven); keyed `(program_id, track_slug)` |
| `session_content` | Per-session content; UNIQUE `(program_id, track, week_number)` |
| `student_tracks` | Enrollments; UNIQUE `(student_id, track_slug)` — NO program_id, unlike its siblings |
| `instructor_tracks` | Instructor assignments; UNIQUE `(student_id, track_slug, program_id)` |
| `hidden_courses` | Reversible hide (hide, don't delete) |
| `allowed_signup_emails` | Allowlist per track (invite list + self-signup gate) |
| `landing_pages` | Campaign landing pages rendered at `/bcc/[slug]` |
| `survey_responses` / `public_survey_responses` | Auth / public survey submissions; cohort-tagged via `program_variant` |
| `attendance`, `submissions`, `reflections`, `track_completions`, `week_progress` | Learner activity; completion = certificate issued |
| `activity_events`, `analytics_daily_snapshots` | Engagement capture + daily rollups |
| `announcements`, `admin_access_log`, `tutor_messages` | Comms, PII audit trail, tutor usage |

---

## Development Workflow

Feature branch → PR → GitHub → Vercel auto-deploy. Git hooks block direct commits to main. Never push directly with `vercel --prod`. The "smoke" check is non-required and usually red; merge once Vercel is green.

One-off production data fixes: small node scripts run with `node --env-file=.env.local` against PostgREST with the service key (same pattern as `scripts/audit-data.mjs`). Verify state before writing; scope updates to exact rows.

### Hard-won gotchas

- Admin course actions must call `revalidatePath` or route-cached admin pages show stale data.
- `student_tracks` upsert `onConflict` must match its `(student_id, track_slug)` constraint or it throws silently.
- Enrolled learners get authenticated surveys (`/dashboard/survey/<id>`); public `/survey/<id>` is only for people with no account.
- Recordings: `blob:` paths only. A presigned URL in `recording_url` dies within 7 days.
- Live Zoom joins are gated to the session's calendar day and retire 30 min after scheduled end.
- Courses are hidden, never deleted, when they have data.

---

## Coding Behavior Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused. Leave pre-existing dead code alone.

Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan with a verify step for each.
