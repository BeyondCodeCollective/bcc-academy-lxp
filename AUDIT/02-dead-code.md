# Phase 2: Dead code report (report only, nothing changed outside AUDIT/)

## Method and tool versions

- knip 5.88.1 via `pnpm dlx knip@5` with a custom config (kept in the session scratchpad, not the repo). Entry points: every `page|layout|route|loading|error|not-found|template|opengraph-image|icon|sitemap|robots` under src/app, `src/proxy.ts`, scripts/, tests/, evals/. Raw output: `AUDIT/logs/knip.txt`.
- Every knip finding was re-checked with `grep -rIw` over src, scripts, tests, evals, docs, next.config.ts, vercel.json (excluding node_modules, .next, archive, AUDIT, `atlas.html`, `*.min.js`). Counts in `AUDIT/logs/exports-refcount.txt`, `types-refcount.txt`.
- API routes: grep of each route path over src/scripts/tests/docs/vercel.json/next.config.ts. Pages: same for each static route prefix. Env vars: `process.env.X` in src/scripts/tests/evals vs `.env.local.example`. DB tables: `create table` in supabase/migrations vs word-grep in src/scripts/tests/evals. CSS: custom properties and classes in globals.css vs src.
- Note: `src/app/platform-atlas/atlas.html` mentions many routes/files in prose. It was excluded from caller counts because it is documentation, not a caller.
- Baseline unchanged: no file outside AUDIT/ touched, no installs, no network except `pnpm dlx` download.

## DELETE-SAFE

Proof for the file rows: `AUDIT/logs/proof-delete-safe-files.txt` (one grep over src scripts tests docs evals next.config.ts *.json for every basename and import path below, run outside the cluster itself: 0 hits; the single hit is an HTML `id="track-picker"` string inside track-picker.tsx itself). No dynamic imports of these exist (`grep -rn "dynamic(" ` hits only inside MarketingHome, which is itself dead). None is a route or entry point.

| Path or symbol | Kind | Proof | Last touched |
|---|---|---|---|
| src/components/marketing/MarketingHome.tsx | component (root of dead cluster, 0 importers) | `grep -rn "MarketingHome" src` returns only its own file. Apex page.tsx uses ApexEntry + HeroVideo instead | 2026-05-25 |
| src/components/marketing/{ChatButton,EventCard,EventsSection,FAQSection,FinalCTA,Footer,Header,Hero,HubsSection,HumanInTheLoop,LiveSessionsSection,OurPeopleSection,PathwaysSection,PhotoStrip,ProgramsSection,ProofSection,VideoBackground}.tsx (17 files) | components, only imported by MarketingHome or each other | proof log, 0 outside hits. `BrandWordmark.tsx` in the same folder IS used (QuizClient), keep it | 2026-05-02 to 2026-08-02 |
| src/data/marketing/facilitators.ts, hubs.ts, sessions.ts | data, only imported by the dead sections | proof log. (`events.ts`, `quiz.ts`, `pathways.ts`, `careerPathways.ts`, `videos.ts` in that folder are live) | 2026-05-06 to 2026-07-01 |
| src/lib/marketing-motion.ts | lib, only imported by the dead cluster | proof log | 2026-05-23 |
| src/lib/course-summary.ts | lib | proof log, 0 hits anywhere | 2026-07-09 |
| src/components/copy-invite-link.tsx | component | proof log, 0 hits | 2026-06-13 |
| src/app/dashboard/admin/allowlist/allowlist-form.tsx and track-picker.tsx | components (superseded "Add People" flow) | proof log, only each other | 2026-08-31 / 2026-07-10 |
| src/app/dashboard/admin/invites/invites-panel.tsx | component | proof log, 0 hits | 2026-07-27 |
| src/app/dashboard/admin/surveys/unified-surveys-dashboard.tsx | component | proof log, 0 hits | 2026-07-27 |
| `scrollbar-hide` class in src/app/globals.css (lines 240-246) | CSS class | `grep -rnF scrollbar-hide src public` returns only globals.css | n/a |
| globals.css tokens `--color-background`, `--color-foreground`, `--color-bcc-orange`, `--color-dark-orange`, `--color-forest-green`, `--color-grey-2` | CSS tokens | `grep -rIlF -e <name> src scripts public tests` returns only globals.css; no `bg-/text-/border-` utility of that name exists. (`--background`/`--foreground` base vars ARE used at globals.css:291-292, keep those) | n/a |
| Unused exported symbols (declaration only, name appears once repo-wide): updateCohortAction, createCohortAction (actions-students.ts); sendInviteAction, deleteSurveyResponse, deletePublicSurveyResponse, getBCCSurveyResponses (actions-surveys.ts); PLATFORM_SURVEY_TITLES, anonymizeName (admin-shared.tsx); markAssessmentViewed (assessment/actions.ts); cobaltAt (stats/palette.ts); ENGAGEMENT_SIGNALS (analytics/engagement.ts); primaryEngagementSignal, showsVideoColumn (analytics/modality.ts); LIKERT_LABELS, WORK_STYLE_BALANCED (assessment/content.ts); getProgramFeatures, setAssessmentEnabled, setTrackAssessmentEnabled, getTrackFeatures (assessment/features.ts, whole file likely removable); elapsedSessions (attendance/compute.ts); ORGANIZER_URL, getEvents (eventbrite.ts); getLaunchReadiness (launch-readiness.ts); isUploadedRecording, toVideoProxyUrl, getYouTubeThumbnailUrl (storage-utils.ts); SHARED_DEMOGRAPHIC_IDS, DEMOGRAPHIC_ALIASES (surveys/schemas.ts); completedTrackSlugs (tracks/completion.ts); CATEGORY_LABELS (utils.ts) | exported symbols (delete the export or function, not the file) | `grep -rIwo <name> src scripts tests evals` = 1 hit (its own declaration). Per-symbol counts in `AUDIT/logs/exports-refcount.txt` | see log (2026-06 to 2026-11) |
| Unused exported types, declaration only: MetricKey, WorkStylePole, AssessmentResultRow, AssessmentProgressRow, MvpProgramDetail, InstructorRole | types | same grep, 1 hit each (`types-refcount.txt`) | see log |

knip also lists ~80 more "unused exports" and ~140 "unused exported types" that are referenced inside their own file (just over-exported, not dead). Not listed here; see `AUDIT/logs/knip.txt`. Low value, skip.

## LIKELY-DEAD (needs a human decision)

| Item | Evidence | Risk of deleting |
|---|---|---|
| /platform, /platform-atlas, /platform-brief, /platform-features, /platform-map (pitch pages) | Linked only from each other and from `docs/walkthrough-plan.md`, `scripts/shot-sitemap.mjs`, a vitest (`shared-integrations.test.ts`) and `next.config.ts` tracing include for atlas.html. No link from learner/admin nav or marketing. Memory notes say "/platform pitch-only" (#898) | Shared with funders by URL. Deleting breaks those links. Also remove the next.config.ts `outputFileTracingIncludes` entry and the test with it |
| /apply/sbft (page, actions.ts, public-apply-form.tsx), /apply/home-for-summer/public-apply-form.tsx | Pages render a closed notice. page.tsx comments say "To reopen, render PublicApplyForm from ./public-apply-form again". The forms and sbft/actions.ts are knip-unused. sbft not in sitemap, no inbound links; home-for-summer is in sitemap | Intentional parked code for reopening. `/apply/security-plus` is live (its own public-apply-form is imported) and `/apply/[slug]` is the generic route |
| /assessment-preview | No inbound link, no sitemap entry, 14-line page + wizard.tsx, last touched 2026-10-04 | Likely an internal preview for the learner pathway assessment (lpat) work. Owner decision |
| /dashboard/admin/surveys/all, /dashboard/mass/[week], /dashboard/techplus/[week] | 9-10 line redirect shims. surveys/all redirects to /dashboard/admin/surveys, mass/techplus redirect to /dashboard/track/<slug>/<week>. Zero links | Bookmark compatibility only. Harmless; delete after a grace period |
| /api/auth/account-exists, /api/auth/check-email | 0 callers (comment in central-login-form.tsx says the client no longer calls account-exists). atlas.html notes they "always answer yes" (enumeration defence). Last touched 2026-05-23. Looks like leftover from the old login flow | Low. Not a webhook. Confirm no external script hits them |
| /api/upload | 0 callers; typed to `track: "mass" or "techplus"` only (atlas.html itself flags "widen to DB-driven tracks"). Last real change 2026-06-26 | Admin uploads now appear to go through server actions. Verify with a prod log check before deleting |
| /api/week-progress | 0 callers anywhere. Last touched 2026-05-15 | Same as above; superseded by server actions |
| /api/quiz/results | Called by QuizClient.tsx:732 but `QUIZ_RESULTS_EMAIL_ENABLED = false` is hardcoded (route.ts:7), so the email never sends. atlas.html: "ship or drop?" | Product decision: enable or remove the route and the client fetch |
| /api/dev-login | Called from central-login-form.tsx:75 (dev convenience). Make sure it is hard-disabled in prod | Security review item rather than dead code |
| Eventbrite stack (see verdict below): /api/eventbrite/claim, /api/eventbrite/webhook, src/lib/eventbrite-funnel.ts, eventbrite.ts, camp-eventbrite-register.tsx, eventbrite_orders table | Dormant, not removed | See verdict |
| Hardcoded /apply/security-plus, /apply/home-for-summer beside /apply/[slug] | Static siblings win routing (documented in apply/[slug]/page.tsx header). Both are in sitemap.ts and platform-map | Both are live entry points for existing campaigns; migrate to DB-driven slug only after redirects are in place |
| Root clutter (none referenced by src, scripts, tests, tsconfig, eslint, vitest, playwright, vercel.json, next.config.ts unless noted): `Screenshot 2026-07-20 at 8.29.23 AM.png`, `Screenshot 2026-07-20 at 8.34.32 AM.png`, `lxp-one-sheet.html`, `upskill-bahamas-analysis.html`, `catalyst-comptia-security-application-detailed.pdf`, `board-meeting-script.md`, `BCC_PORTAL_OVERVIEW.md`, `SECURITY-AUDIT-2026-06-25.md`, `squirrel.toml` (crawler config, name "atg-portal", last touched 2026-03-29), `qr-codes/` (forge-ai-*.png), `bcc-academy-features.html` (byte-identical to `public/bcc-academy-features.html`; next.config.ts redirects the URL to /help anyway) | grep over src scripts tests docs evals *.json *.ts *.mjs .github returns 0 hits for each | Human-authored content (decks, scripts, audit). Move to an archive repo or a docs/ folder rather than delete. `bcc-academy-features.html` root copy is a pure duplicate |
| `archive/` (52 tracked files, incl. marketing-v0.1) | Excluded from tsconfig (`exclude: ["node_modules","gsd-2","archive"]`). No code references | Human content. Move out of the repo or keep as is. tsconfig exclude then becomes removable |
| `demo/` (run.mjs, seed.mjs, generate-*.mjs, os-cursor.mjs, script.md, audio/, emails/) | No code or config references `demo/`. Not in package.json scripts | Demo-video tooling; owner decision. Not typechecked (all .mjs) |
| `learnerpathwayassessmenttoolbuildpacket/` (PDF + 4 md design packets) | Referenced only by `docs/superpowers/specs/2026-06-04-learner-pathway-assessment-design.md` | Source spec for the lpat feature. Keep with the lpat decision |
| 7 `lpat_*` tables: lpat_archetype_vertical_ratings, lpat_decision_log, lpat_lanes, lpat_roles, lpat_track_archetype_ratings, lpat_tracks, lpat_verticals | Zero word-matches in src/scripts/tests/evals. Created by migrations `20261004000000_lpat_entry_flow.sql` and `20261004010000_lpat_config_and_decision_log.sql` (5 weeks old). `lpat_confidence` IS referenced (assessment/exit-confidence.ts, entry-actions.ts) | Never delete a DB object from an audit. These look like seeded config for the assessment build (see build packet above). Ask the owner whether the lpat config work shipped or was shelved |
| 65 public/ assets with no basename reference in src/scripts/docs (list in `AUDIT/logs/public-unreferenced.txt`): e.g. public/ai-lxp-competitive-report.html, design-direction.html, public/atg-logo.*, public/camp-*.jpg, public/docs/*.html and techplus-syllabus.pdf, public/guides/0*.jpg, public/images/bcc/{faces,catalyst,icons,...} | No basename hit in code | Public URLs may be used by DB rows (`landing_pages`, `track_overrides.hero_image`), emails, decks, or external sites. Cannot be proven dead without DB access. Do not delete |
| marketing `cream` colour: `--color-cream` | No `*-cream` utility found, but the word "cream" appears in 7 src files (probably theme names) | Low; check before removing |
| Superseded Sept 2026 redesign UI | No component untouched since before 2026-09 with zero importers other than the DELETE-SAFE rows above (knip's unused-file list is complete; every item dates 2026-05 to 2026-08). The old marketing home cluster and the pre-"Add People" allowlist/invites panels are the redesign leftovers | n/a |
| scripts/ (26 files) | One-off and test-account helpers (make/cleanup-*-test-student, send-roblox-reminder, forte-test-magiclink, backfill-*, seed-forward-deploy, fde-cold-walk). Only `copy-zoom-sdk.mjs`, `check-us-english.mjs` are wired into package.json | Not individually proven. They may be needed for ops; move rarely-used ones to a tools repo instead of deleting |
| AGENTS.md (and README.md) stale paths | Both say `cd /Users/fonz.morris/fonz.sh/bcc-lxp`, a directory that does not exist (memory notes say all projects live in ~/dev/bcc). CLAUDE.md says the repo is `bcc-academy-lxp`. tsconfig exclude lists `gsd-2`, which does not exist | Doc-only fix |

## KEEP (looked dead, is not)

- src/lib/exams/network-plus-post.ts (v1) and network-plus-post-v2.ts: both imported by `exams/index.ts` and registered in the exam map. Neither is dead.
- /api/warm-eu: called by `/api/warm` (cron */5, `warm/route.ts:55`), intentionally absent from vercel.json.
- /api/eventbrite/*, /events/cancel|confirm|survey/[token], /events/check-in/[id], /privacy/withdraw/confirm: emailed or QR link targets built with template strings (events-comms.ts, privacy/withdraw/actions.ts, admin events qr page).
- /dashboard/exam/[examId]: reached via redirect in its own page and linked by admin exams page.
- /api/cron/*: all 10 in vercel.json (incl. events-waitlist, events-comms, signup-reminders). /api/hooks/deploy-check: external post-deploy hook. /api/csp-report: CSP sink. /api/zoom-frame, /api/zoom-signature, /api/video, /api/fde/voice, /api/calendar/*, /api/events (beacon), /api/attendance, /api/session-content, /api/instructor, /api/tutor, /api/push/subscribe, /api/insights/{csv,pdf}, /api/locations/csv, /api/mvp/export, /api/admin/exit-surveys/csv, /api/events/[id]/{csv,survey-csv}, /api/certificates/[id]/pdf, /api/switch-program: all have a caller in src.
- next.config.ts redirects `/bcc-academy-features(.html)` to /help, `/camp/*`, and rewrites `/empower` and `/sb-...`: live. public/follow/empower-*.html and public/sb-*/ are rewrite targets.
- public/zoom/*: copied by prebuild script; public/decks: unverified, treat as KEEP.
- src/data/marketing/{events,quiz,pathways,careerPathways,videos}.ts and BrandWordmark.tsx: live.
- `--background`, `--foreground` CSS vars and `tailwindcss`, `@tailwindcss/typography` (see deps): used via globals.css.
- knip "Unlisted dependencies" for `server-only`, `postcss`, `playwright`: Next/pnpm-provided, not a problem.

## Unused dependencies

| Package | Evidence | Class |
|---|---|---|
| @anthropic-ai/sdk (devDependency) | `grep -rIn "anthropic-ai/sdk" src scripts tests evals *.ts *.mjs` returns 0 hits (only package.json). `src/lib/ai/model.ts` uses `@ai-sdk/anthropic` | DELETE-SAFE (remove from package.json in a later phase; lockfile will change) |
| @zoom/meetingsdk | No import, but `scripts/copy-zoom-sdk.mjs` (prebuild) reads `node_modules/@zoom/meetingsdk/dist` | KEEP |
| @tailwindcss/typography | `@plugin "@tailwindcss/typography"` in globals.css:6 | KEEP |
| tailwindcss | `@import "tailwindcss"` in globals.css:5 | KEEP |
| @tiptap/pm | Required peer of the tiptap packages | KEEP |

All other dependencies have at least one import (checked by string grep). lucide-react (46 files) and @phosphor-icons/react (80 files) are both in use, which is a consistency issue (DESIGN.md says Phosphor is THE icon lib) but not dead code.

## Env var drift

59 distinct `process.env.X` names in code; `.env.local.example` has 24 names. Raw: `AUDIT/logs/env-used-names.txt`, `env-example.txt`.

- In example but never used in code: none.
- Used in code, missing from `.env.local.example` (35): AI_GATEWAY_API_KEY, ANTHROPIC_API_KEY, APPLICATION_NOTIFY_EMAIL, BLOB_READ_WRITE_TOKEN, CERTIFICATE_NOTIFY_EMAIL, CERTIFICATES_DRIVE_FOLDER_ID, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, INSTRUCTOR_MODEL, MVP_BRIEF_PDF, MVP_SAMPLE_PDF, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, PEXELS_API_KEY, SENTINEL_NOTIFY_EMAIL, SLACK_BOT_TOKEN, SMOKE_BASE_URL, SMOKE_SUPER_ADMIN_EMAIL, STAFF_DOMAIN_PROGRAMS, VAPID_PRIVATE_KEY, VERCEL_AUTOMATION_BYPASS_SECRET, VERCEL_OIDC_TOKEN, ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, PLAYWRIGHT_TEST_BASE_URL, QA_WRITES, WEEK. System or CI vars (CI, NODE_ENV, VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL) need no entry.
- Notable: AI_GATEWAY_API_KEY and VERCEL_OIDC_TOKEN (the local AI setup per CLAUDE.md), ZOOM_* and SENTINEL_NOTIFY_EMAIL are documented in CLAUDE.md but absent from the example file. `ANTHROPIC_API_KEY` is read by lib/ai/model.ts. `STAFF_DOMAIN_PROGRAMS` is both a const export and an env name, check it is not a confusion.
- Not checked: Vercel project env (can't see prod); whether any var in the example is only read through destructuring or `process.env[...]` dynamic access.

## DB objects without code

- 60 tables created in migrations. 7 have zero code references: the `lpat_*` set listed above (LIKELY-DEAD, owner decision). `assessment_progress`, `catalyst_intake`, `signup_reminders` are referenced from a single file each (live, not dead).
- `eventbrite_orders`: referenced only through the retired Eventbrite funnel (see verdict).
- Columns, views, functions, policies and storage buckets: not checked.
- Note: `create table` grep only catches tables created in migrations; tables created in the dashboard are invisible.

## Eventbrite / Hivebrite / WordPress verdict

- WordPress: zero references in src, scripts, supabase, next.config.ts. Clean.
- Hivebrite: 5 mentions, all comments or help text in the events import (`events-import.ts`, `events.ts`, admin events import page/actions, `events/page.tsx` comment "once Hivebrite is retired"). It is a CSV column mapper for registration exports. Remnant text only, no integration code. KEEP, optionally reword.
- Eventbrite: 37 files mention it. It is dormant, not dead. Live entry points still exist: (1) `/api/eventbrite/webhook` (external, secret-keyed) and `/api/eventbrite/claim` (called from `camp-eventbrite-register.tsx`); (2) `landing-view.tsx:388` renders the embedded widget whenever a `landing_pages` row has `eventbrite_event_id` set (admin landing form still lets staff set it); (3) `lib/course-import/source.ts` uses the Eventbrite API to import a course from an event link (an active feature). atlas.html says "Eventbrite door (retired)... still in the codebase, no longer in the path", and landing pages now have a native pick-a-date enroll form (`landing-pages.ts`, "no Eventbrite"). Whether any landing_pages row still has `eventbrite_event_id` cannot be known without DB access. Verdict: LIKELY-DEAD pending one SQL check (`select count(*) from landing_pages where eventbrite_event_id is not null` and recent `eventbrite_orders`). Order of removal if confirmed: widget in landing-view and camp-eventbrite-register, webhook and claim routes, eventbrite-funnel.ts, eventbrite.ts `getEvents`/`ORGANIZER_URL` (already dead), `data/marketing/events.ts` fallback, then (separately, by migration) the `eventbrite_orders` table and column. The import feature in course-import/source.ts is independent; keep or decide separately.

## What was not checked

- Production DB state (no credentials): landing_pages.eventbrite_event_id, unused columns, whether public/ assets or lpat tables are referenced by rows or external sites.
- Vercel logs for the zero-caller API routes (account-exists, check-email, upload, week-progress); external callers cannot be ruled out from the repo.
- Unused DB columns, RLS policies, SQL functions, storage buckets.
- public/decks, public/follow, public/sb-*, public/fonts contents (excluded from the asset check).
- Dynamic `process.env[...]` access, string-built route paths beyond the patterns grepped, and CSS class usage built from template literals (Tailwind classes were not audited; only the 16 custom classes and 78 custom properties in globals.css).
- Test files and docs/ individually (only counted as references, not audited for staleness). `src/app/platform-atlas/atlas.html` is a hand-built static file; its internal links were not validated.
- Whether `src/proxy.ts` public-route allowlist still lists removed paths.
