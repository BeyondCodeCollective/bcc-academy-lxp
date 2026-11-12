# 00 Map: bcc-academy-lxp inventory

Branch `audit/overnight-20261112`, commit `2ab1615e`. Counts come from grep/find over the working tree, not from a build. Nothing was run against any database or external service.

## Size

| Thing | Count |
|---|---|
| TypeScript in `src` | 120,901 lines |
| Test code in `src` | 7,354 lines in 99 files |
| Pages (`page.tsx`) | 104 |
| Layouts | 5 |
| API route handlers (`route.ts`) | 46 |
| `loading.tsx` / `error.tsx` / `not-found.tsx` | 6 / 4 / 1 |
| Shared components (`src/components`) | 110 `.tsx` |
| Route-colocated `.tsx` in `src/app` | 251 |
| `src/lib` modules | 301 files |
| `"use client"` files | 198 |
| `"use server"` files | 55, exporting 172 server actions |
| Files over 400 lines (non-test) | 50 |
| Migrations | 129 SQL files |
| Scripts | 26 |
| Commits | 1,808 total, 1,533 in the last 6 months |

## Stack

Next.js 16.2 (App Router, `src/proxy.ts` instead of middleware), React 19.2, Tailwind 4, Supabase (`@supabase/ssr` 0.9, `supabase-js` 2.99), Vercel (Blob, Analytics, Sandbox), `ai` SDK 6 with `@ai-sdk/anthropic`, Resend, Zoom Meeting SDK, TipTap, `@react-pdf/renderer`, framer-motion, web-push, jszip, qrcode. Two icon libraries: `lucide-react` and `@phosphor-icons/react`. Tests: vitest 4, Playwright 1.64. Package manager: pnpm 10, Node 24 in CI.

27 runtime dependencies, 13 dev dependencies. No validation library (no zod), no date library, no error tracker, no i18n library.

## Routes (top level of `src/app`)

Public and marketing: `/` , `/[program]/[slug]`, `/bcc/[slug]` (DB-driven landing pages), `/apply/[slug]` plus three hardcoded forms (`/apply/home-for-summer`, `/apply/sbft`, `/apply/security-plus`), `/events`, `/join`, `/invite`, `/login`, `/auth`, `/survey`, `/quiz`, `/pathways`, `/assessment-preview`, `/certificate`, `/help`, `/privacy`, `/terms`.

Pitch and internal docs served as routes: `/platform`, `/platform-atlas` (a static `atlas.html` behind a route handler), `/platform-brief`, `/platform-features`, `/platform-map`.

Learner portal `/dashboard`: `agreement`, `assessment`, `courses`, `exam`, `guide`, `help`, `insights`, `lunch-learn`, `mass`, `resources`, `settings`, `staff-welcome`, `start`, `survey`, `switch-program`, `techplus`, `track/[slug]/[week]`, `tutor`, `workshops`.

Admin `/dashboard/admin`: home (tabbed), `allowlist`, `applications`, `events`, `features`, `health`, `insights`, `invites`, `landing`, `landing-signups`, `media`, `mvp`, `organizations`, `programs`, `surveys`.

## API routes (46)

Cron (10 in `vercel.json`): `warm`, `cron/daily-snapshot`, `cron/sentinel`, `cron/zoom-attendance`, `cron/certificates`, `cron/ta-digest`, `cron/zoom-recordings`, `cron/events-waitlist`, `cron/events-comms`, `cron/signup-reminders`. `warm-eu` exists as a route but is not in `vercel.json`.

Webhooks and hooks: `eventbrite/webhook`, `eventbrite/claim`, `hooks/deploy-check`, `csp-report`.

Learner: `attendance`, `week-progress`, `session-content`, `tutor`, `zoom-signature`, `zoom-frame`, `video`, `push/subscribe`, `calendar/[token]`, `calendar/event`, `switch-program`, `upload`, `fde/voice`, `quiz/results`.

Admin and exports: `insights/pdf`, `insights/csv`, `locations/csv`, `mvp/export`, `admin/exit-surveys/csv`, `certificates/[id]/pdf`, `events`, `events/[id]/csv`, `events/[id]/survey-csv`, `instructor`.

Auth: `auth/check-email`, `auth/account-exists`, `dev-login` (guarded by `NODE_ENV !== "development"`, `src/app/api/dev-login/route.ts:7`).

## Server actions

55 files, 172 exported actions. The largest: `dashboard/admin/actions-surveys.ts` (1,111 lines), `actions-tracks.ts` (684), `actions-misc.ts` (649), `programs/actions.ts` (637), `actions-analytics.ts` (486), `programs/import-actions.ts` (481), `landing/actions.ts` (429).

## `src/lib` areas

Folders: `accessibility`, `ai`, `analytics`, `assessment`, `attendance`, `auth`, `certificates`, `course-import`, `exams`, `instructor`, `lunch-learns`, `mvp`, `onboarding`, `programs`, `sentinel`, `supabase`, `surveys`, `tracks`, `tutor`.

Integration modules: `mailchimp.ts` (80 lines), `eventbrite.ts` (257), `eventbrite-funnel.ts` (129), `zoom.ts` (39), `zoom-recordings.ts`, `zoom-report.ts`, `zoom-binding.ts`, `slack.ts` (49), `google-drive.ts` (233), `gcal.ts`, `push.ts` (92), `email.ts` (1,495 lines, 22 senders), `blob-recordings.ts`.

## Database (from migrations only, live schema not inspected)

60 tables have a `CREATE TABLE` in migrations: activity_events, admin_access_log, allowed_signup_emails, alumni_enrollments, analytics_daily_snapshots, announcements, application_submissions, applications, assessment_progress, assessment_results, attendance, catalyst_intake, deployment_notes, event_attendees, event_registrations, event_survey_responses, eventbrite_orders, events, exam_attempts, hidden_courses, human_checkpoints, instructor_flags, instructor_tracks, invites, landing_pages, landing_signups, 8 `lpat_*` tables, lunch_learns, media_library, mvp_attendance_reviews, notification_preferences, program_features, programs, public_survey_responses, push_subscriptions, reflections, resources, sentinel_dismissals, session_content, session_exit_surveys, session_lessons, signup_reminders, staff_emails, staff_program_access, student_tracks, submission_feedback, submissions, survey_responses, ta_changes, track_completions, track_overrides, tutor_messages, week_progress.

Tables used by code with **no `CREATE TABLE` in any migration**: `students` (124 references, the most-used table), `cohorts` (8), `track_features` (7). They are only ever `ALTER`ed.

Tables created but never referenced from `src`: 7 of the `lpat_*` tables (`lpat_archetype_vertical_ratings`, `lpat_decision_log`, `lpat_lanes`, `lpat_roles`, `lpat_track_archetype_ratings`, `lpat_tracks`, `lpat_verticals`).

RLS: all 60 created tables have an `ENABLE ROW LEVEL SECURITY` statement. 75 `CREATE POLICY` statements. 6 SQL functions (`current_user_is_staff`, `finalize_mvp_attendance_review`, `generate_participant_code`, `offer_waitlist_seats`, `register_event_attendees`, `stamp_participant_code`). 123 indexes, 124 foreign-key references, 41 unique constraints.

Storage buckets referenced: `resumes`, `landing`, plus application uploads and the media library.

Most-queried tables in code: students 124, student_tracks 74, programs 69, track_overrides 48, allowed_signup_emails 30, survey_responses 28, attendance 27, week_progress 23, invites 23, events 23.

## Environment variables

49 distinct `process.env.*` names read across 59 files. `.env.local.example` documents 24. Undocumented (25): APPLICATION_NOTIFY_EMAIL, BLOB_READ_WRITE_TOKEN, CERTIFICATE_NOTIFY_EMAIL, CERTIFICATES_DRIVE_FOLDER_ID, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, INSTRUCTOR_MODEL, MVP_BRIEF_PDF, MVP_SAMPLE_PDF, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, PEXELS_API_KEY, SENTINEL_NOTIFY_EMAIL, SLACK_BOT_TOKEN, STAFF_DOMAIN_PROGRAMS, VAPID_PRIVATE_KEY, ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, plus the platform-provided NODE_ENV, VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL.

## Feature flags

No flag system. Behavior switches are: `programs.is_dynamic`, `program_features` and `track_features` tables, `tutorConfig.enabled` in program config, env switches (`LOGIN_VIA_RESEND`, `SENTINEL_AUTO_FIX`, `AI_PROVIDER`), and code constants such as `QUIZ_RESULTS_EMAIL_ENABLED = false` (`src/app/api/quiz/results/route.ts:7`).

## CI and tooling

`.github/workflows/ci.yml`: typecheck, unit tests, US-English guard. No lint job and no build job. `login-smoke.yml`: Playwright smoke. `evals.yml`: AI evals. `tests/smoke` has 7 specs, `tests/qa` has 2.

## Non-code in the repo root

`archive/` (52 files, includes `marketing-v0.1`), `demo/`, `docs/` (68 files), `learnerpathwayassessmenttoolbuildpacket/`, `qr-codes/`, two screenshots, three standalone HTML one-sheets, a PDF, `board-meeting-script.md`, `SECURITY-AUDIT-2026-06-25.md`, `squirrel.toml`. `public/` is 21 MB.
