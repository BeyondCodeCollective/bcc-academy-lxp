# BCC Academy Portal — System Overview

> Last updated: June 9, 2026  
> For: BCC team — internal reference

---

## What Is This?

The BCC Academy Portal is a multi-program learning management system built for the Beyond Code Collective. It runs as a single Next.js codebase that serves **three separate program websites** from distinct domains. Each program gets its own branded experience while sharing the same backend, database, and admin infrastructure.

---

## The Three Programs

| Program | Domain | Audience | Status |
|---|---|---|---|
| **After The Game (ATG)** | atg.bccacademy.io | Athletes transitioning to tech | Active (Cohort 1) |
| **Beyond Code Centers** | forge.bccacademy.io | General BCC learners | Active |
| **Catalyst** | catalyst.bccacademy.io | CompTIA Network+ cohort | Active |

Each program is defined in its own config file (`atg.ts`, `forge.ts`, `catalyst.ts`) and controls: branding/colors, tracks, weekly schedule, surveys, and cohort dates.

---

## How the Site Is Organized

```
bccacademy.io (shared codebase)
│
├── / (home / login page)
│
├── /dashboard                     ← Student portal (requires login)
│   ├── /dashboard                 ← Home: redirects to survey if needed, then shows dashboard
│   ├── /dashboard/survey/[id]     ← In-app survey (authenticated students)
│   └── /dashboard/track/[slug]/[week]  ← Weekly track content, submissions, reflections
│
├── /dashboard/admin               ← Admin panel (staff + instructors)
│   └── /dashboard/admin/surveys   ← BCC-wide survey results (super_admin only)
│
└── /survey/[id]                   ← Public surveys (no login required)
```

---

## Student Journey (After Login)

```
Student logs in
      ↓
Auth callback checks:
  • Is this an admin/instructor? → Go to /dashboard/admin
  • Does this program require the BCC intake survey?
      → Survey not completed? → /dashboard/survey/bcc-learner-intake
      → Survey completed? → /dashboard
      ↓
Dashboard
  • Shows cohort tracks, weekly content, progress
  • Links to reflections, submissions, announcements
  • If a program survey is required and not completed → redirect to survey
```

---

## Tracks

Each program has **tracks** — the core learning threads students follow each week.

**After The Game tracks:**
- MASS Wraparound (weekly coaching)
- CompTIA Tech+ (certification prep)
- Financial Literacy

**Beyond Code Centers tracks:**
- Varies by cohort configuration

**Catalyst:**
- CompTIA Network+ (no dashboard — Catalyst is survey-only, no weekly content)

Each track week has: session content, a reflection prompt, and submission capability.

---

## The Survey System

This is the most complex part of the platform. There are **two types** of surveys and **two rendering pipelines**.

### Survey Types

| Type | Who fills it out | Storage table | URL pattern |
|---|---|---|---|
| **Authenticated** | Logged-in students | `survey_responses` | `/dashboard/survey/[id]` |
| **Public** | Anyone (walk-ins, events) | `public_survey_responses` | `/survey/[id]` |

### All Surveys, by Scope

#### Platform-Level (cross-program, BCC-wide)

These are not tied to any single program — they work on every domain.

| Survey | ID | Auth or Public | Purpose |
|---|---|---|---|
| BCC Learner Intake | `bcc-learner-intake` | **Both** | Demographics, background, goals. Required for most programs on login. ATG has its own intake so it's exempt. Also available as a walk-in public form. |
| Workshop Survey | `bcc-workshop` | **Public only** | Post-event feedback for workshop attendees. No account needed. |

#### Program-Specific (attached to one program)

| Survey | ID | Program | Auth or Public |
|---|---|---|---|
| ATG Pre-Survey | *(in ATG config)* | After The Game | Authenticated |
| ATG Mid-Program Survey | `mid-program-spring-2026` | After The Game | Authenticated |
| CompTIA Network+ End-of-Cohort | `network-plus-post` | Catalyst | Public |

### Survey Rendering Pipelines

**Authenticated surveys** (`/dashboard/survey/[id]`)
→ Use the `SurveyWizard` component — a multi-page wizard with progress saved to localStorage. All question types live in `survey-fields.tsx`.

**Public surveys** (`/survey/[id]`)
→ Each survey has its own custom component:
- `PublicLearnerIntake` — walk-in version of the BCC intake
- `PublicWorkshopSurvey` — post-workshop feedback
- `PublicNetworkPlusSurvey` — Catalyst end-of-cohort

### Question Types Available

- **Text** (short single-line, or long textarea)
- **ZIP code** (digits-only, enforced 5-digit validation)
- **Radio** (single choice)
- **Multi-select** (checkboxes)
- **Likert scale** (1–5 rating per statement)
- **Dual-Likert** (before/now comparison — used for mindset and tech confidence change)
- **Month/Year picker** (date of birth, start dates)
- **Date** (standard date input)
- **Consent** (checkbox with legal text, required before any data is collected)

---

## The Admin Panel

Accessible at `/dashboard/admin`. Role-gated: students see nothing, instructors see limited views, managers/admins see everything.

### Roles

| Role | What they can access |
|---|---|
| `student` | Dashboard only |
| `instructor` | Admin panel → their assigned tracks only |
| `admin` | Full admin panel for their program |
| `super_admin` | All programs + BCC-wide surveys page |

### Admin Tabs

| Tab | What it shows |
|---|---|
| **Program** | Cohort settings, program-level public survey stats, inline response viewer, CSV export |
| **[Track name]** × N | Attendance, week-by-week status, submission review, announcements per track |
| **People** | All students — roles, cohort assignments, engagement scores, survey completion |
| **Enrollments** | Enrollment management, track assignments |
| **Student Work** | All submissions and reflections across the program, with instructor feedback |
| **Analytics** | Attendance tracking and engagement scoring |

### BCC-Wide Surveys Page (`/dashboard/admin/surveys`)

Super-admins only. Accessible via the program switcher dropdown → "BCC — Surveys".

Shows all platform surveys aggregated across every program:
- Total response counts
- Per-program breakdown (e.g., "12 Forge enrolled · 5 ATG public")
- Expandable respondent list per survey
- Inline answer viewer per respondent
- Filter by program
- CSV export
- Delete public responses

---

## Database Tables

| Table | What it stores |
|---|---|
| `students` | All users — role, cohort, program, name, email |
| `programs` | Program records (slug, ID) |
| `cohorts` | Cohort definitions per program |
| `student_tracks` | Which tracks a student is enrolled in |
| `instructor_tracks` | Which tracks an instructor is assigned to |
| `survey_responses` | Authenticated survey submissions (keyed by student + survey type) |
| `public_survey_responses` | Public/walk-in survey submissions (keyed by email + program + survey type) |
| `attendance` | Weekly attendance records |
| `submissions` | Student project/work submissions per track week |
| `submission_feedback` | Instructor feedback on submissions |
| `reflections` | Weekly reflection responses |
| `track_completions` | Marks when a student finishes a track |
| `session_content` | Admin-authored content for each track week |
| `announcements` | Track-level announcements from instructors |
| `admin_access_log` | Audit trail — every time a super_admin views, exports, or deletes PII |

---

## How Multi-Program Routing Works

The platform detects which program to load based on the **domain of the request**:

```
forge.bccacademy.io  →  loads forgeConfig   →  Forge branding, Forge tracks, Forge surveys
atg.bccacademy.io    →  loads atgConfig     →  ATG branding, ATG tracks, ATG surveys
catalyst.bccacademy.io → loads catalystConfig → Catalyst branding, no tracks, Catalyst surveys
```

Super-admins can **switch programs** from the admin panel via a dropdown — this sets a cookie that overrides the domain detection, letting one person manage all three programs.

---

## Key Technology

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Database | Supabase (Postgres + Auth) |
| Hosting | Vercel |
| Auth | Supabase Auth (email/password) |
| Styling | Tailwind CSS |
| State | React `useState` + localStorage for survey progress |

---

## Recent Work (April–June 2026)

### April–May 2026
- **BCC Learner Intake** — full demographic intake survey for new learners, required on first login for most programs
- **ATG Mid-Program Survey** — dual-likert mindset/tech confidence change tracking, coaching quality, CompTIA feedback
- **Public Learner Intake** — walk-in version of the intake, no account needed, for live events
- **Workshop Survey** — post-workshop public form for one-time attendees
- **BCC-wide surveys admin page** — cross-program survey view for super_admins
- **Program switcher** — lets super_admins jump between programs from any admin page
- **Inline response viewer** — expand any respondent row to see their full answers in the admin panel
- **CSV export** — download any survey's responses as a flat CSV (dual-likert fields properly formatted)
- **ZIP code validation** — enforced 5-digit format across all survey forms
- **Audit logging** — every super_admin access to PII is recorded

### June 2026
- **Public assessment preview** — `/assessment-preview` route (no login required, exempt from site password gate) so prospective learners can preview the assessment experience
- **Accessibility controls** — font size adjustment and read-aloud (text-to-speech) controls available platform-wide from the sidebar footer and inline on the assessment page
- **`last_seen_at` tracking** — records when each student was last active; visible in admin People tab
- **Admin home compact list** — replaced large track cards on the admin home with a space-efficient compact list layout
- **OG social preview image** — BCC classroom community photo used for social media link previews
