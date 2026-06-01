# Security+ Cohort Application Form — Design Spec

**Date:** 2026-06-01
**Status:** Approved

## Overview

A login-gated, multi-section application form for Network+ graduates to apply for the CompTIA Security+ Catalyst cohort (July start). Admin reviews submissions in the existing LXP admin survey panel. No new DB tables or admin infrastructure required.

## Scope

- Application form only — no curriculum track, no join page changes.
- Requires an existing BCC Academy login.
- Accessible via direct URL; admin shares the link. No dashboard card.
- Reuses the existing `SurveyWizard` component, `saveSurveyResponse` action, and `survey_responses` table.

## Architecture

### New route

`/dashboard/apply/security-plus`
→ `src/app/dashboard/apply/security-plus/page.tsx`

Server component. Responsibilities:
1. Session guard — unauthenticated requests redirect to `/`.
2. Existing-response check — queries `survey_responses` for `student_id + survey_type = "security-plus-application"`. If `completed_at` is set, renders the "Application received" confirmation state instead of the form.
3. Intro block — cohort name, one-paragraph description, deadline/timeline note ("Decisions shared within one week of the submission deadline. July start.").
4. Renders `SurveyWizard` with the application pages and `surveyId = "security-plus-application"`.

### New supporting file

`src/lib/surveys/security-plus-application.ts`

Exports:
- `SECURITY_PLUS_APPLICATION_PAGES: SurveyPage[]` — the 6-section wizard definition consumed by `SurveyWizard`.
- `SECURITY_PLUS_APPLICATION_SCHEMA: SurveyQuestion[]` — flat question list consumed by `getSurveySchema` in `schemas.ts` for admin insights labels.

### Registrations (edits to existing files)

- `src/lib/surveys/platform.ts` — add `security-plus-application` to `PLATFORM_AUTH_SURVEYS`.
- `src/lib/surveys/schemas.ts` — add `"security-plus-application"` case returning `SECURITY_PLUS_APPLICATION_SCHEMA`.

### Reused without modification

| Asset | Location |
|-------|----------|
| `SurveyWizard` | `src/components/survey-wizard.tsx` |
| `saveSurveyResponse` | `src/app/dashboard/actions.ts` |
| `survey_responses` table | Supabase — no migration needed |
| Admin survey viewer | `/dashboard/admin/surveys/[surveyId]` |

## Survey Pages

`survey_type` key: `"security-plus-application"`

| # | Page title | Question IDs | Notes |
|---|------------|--------------|-------|
| 1 | Your Information | `full_name` | `short: true`, required |
| 2 | Where You Are Now | `work_situation`, `industry`, `tech_in_role`, `used_comptia_at_work` | All open text, all required |
| 3 | What's Next for You | `job_switch_plan`, `security_plus_in_career` | All open text, all required |
| 4 | Why Security+, Why Now | `why_techplus_network_plus`, `cybersecurity_interests` | All open text, all required |
| 5 | Your Commitment | `schedule_july_completion`, `support_needed` | All open text, all required |
| 6 | Anything Else | `anything_else` | Open text, `required: false` |

All questions use `type: "text"` (textarea) except `full_name` which uses `short: true`.

## Data Flow

1. Student visits `/dashboard/apply/security-plus` while logged in.
2. Server checks `survey_responses` — no row found → renders form.
3. Student advances through pages; `SurveyWizard` calls `saveSurveyResponse` with `completed_at: null` on each page (partial save / progress persistence).
4. Student submits final page; `saveSurveyResponse` is called with `completed_at: <timestamp>`.
5. Page re-renders showing "Application received" confirmation state with the timeline message.
6. On future visits, the server detects `completed_at` and renders the confirmation state directly — no re-submission possible.

## Admin View

Submissions surface automatically at `/dashboard/admin/surveys/security-plus-application`.

The existing `SurveyDashboard` component renders per-respondent responses with question labels (sourced from the schema registration), search/filter, and CSV export. No new admin pages required.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Unauthenticated visit | Redirect to `/` |
| Already submitted | Show "Application received" confirmation; no form |
| Partial progress, browser closed | Progress saved; wizard resumes from last completed page on return |
| Admin visits their own URL | Same form experience; their response is stored like any student's |

## Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/apply/security-plus/page.tsx` | New |
| `src/lib/surveys/security-plus-application.ts` | New |
| `src/lib/surveys/platform.ts` | Add `security-plus-application` to `PLATFORM_AUTH_SURVEYS` |
| `src/lib/surveys/schemas.ts` | Add `security-plus-application` case |
