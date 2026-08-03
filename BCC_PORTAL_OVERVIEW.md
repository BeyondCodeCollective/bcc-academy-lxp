# BCC Academy — Platform Overview

> Last updated: August 2, 2026
> For: BCC team — internal reference

---

## What Is This?

BCC Academy is a **cohort program platform**: the operating system for running a
cohort-based learning program and proving it worked. One Next.js codebase serves
multiple organizations, each with its own branding, courses, staff, and learners,
sharing the same backend, database, and admin infrastructure.

We don't sell courses. We run and prove cohort programs. The three things that
set the platform apart:

1. **Multi-org on one codebase** — five organizations live today.
2. **Full program operation** — intake, enrollment, live sessions, attendance,
   recordings, certificates.
3. **Outcome proof** — surveys auto-tagged to cohort, engagement analytics, and
   reporting a funder can trust.

---

## Organizations Live Today

| Organization | Notes |
|---|---|
| **Black Girls Code (BGC)** | Camps and bootcamps (Roblox, Godot, IBM SkillsBuild); COPPA-aware |
| **Forte (Upskill Bahamas)** | 10-week AI Literacy, government-partnered, `forte.bccacademy.io` |
| **Beyond Code Centers** | AI Fundamentals, AI for Digital Natives, AI Automation Bootcamp |
| **Catalyst** | Workforce-dev hub at `bccacademy.io`; aggregates ATG + Beyond Code Centers |
| **After The Game (ATG)** | Athletes transitioning to tech; MASS Wraparound coaching |

Everything routes through the single hub at `bccacademy.io`. Legacy subdomains
redirect. Organizations can now be **created from the admin panel with no
deploy** (Organizations, master tier) — new orgs are DB rows, not code.

---

## Feature Set

### Enrollment & intake
- **Add People** — unified allowlist + invite pipeline; People tab shows the
  full funnel (allowlisted → invited → joined → active).
- **One-click invite links** (`/join`), magic-link login with wrong-account guard.
- **Eventbrite funnel** — register on an embedded Eventbrite page and a webhook
  auto-creates the portal account, allowlists the learner, sends a magic-link
  welcome plus a 24-hour reminder with calendar files. Curriculum is time-gated
  until the cohort start date.
- **Intake surveys** required on first login, per program.
- **Mailchimp sync** — new signups auto-subscribe to the org's audience.

### Running the program
- **Weekly track content** — sessions, resources, submissions, reflections,
  instructor feedback; self-paced tracks get a watched/uploaded progress grid
  instead of a week counter.
- **Attendance** — weekly check-ins per track, admin attendance views.
- **Zoom** — embedded live sessions; cloud recordings **auto-import hourly** to
  private storage and attach to the right session.
- **Certificates** — issued per track completion from the admin panel.
- **Announcements + What's New feed** — consolidated updates with iCal/Google
  Calendar links for scheduled events and office hours.
- **AI tutor** — opt-in per program (live for Upskill Bahamas); US-hosted model
  via Vercel AI Gateway.
- **Accessibility** — font-size controls and read-aloud platform-wide.

### Proving it worked
- **Survey system** — authenticated (`/dashboard/survey/[id]`) and public
  (`/survey/[id]`) pipelines; responses **auto-tagged to cohort** from
  enrollment; question types include dual-Likert before/after confidence
  measures.
- **Survey Insights** — per-survey dashboards with cohort breakdown and filters,
  inline respondent viewer, CSV export.
- **Engagement analytics** — activity events captured platform-wide, daily
  snapshots via cron, admin Engagement tab, `last_seen_at` on every learner.
- **Outcomes** — track completions; every finished cohort to date finished at
  100% (66/66 across Roblox, MASS, Tech+).

### Administration & governance
- **Access tiers** — `master` (platform owner) → `super_admin` (all programs,
  view-only PII) → `admin` (their program) → `instructor` (their tracks) →
  `student`. Cross-program staff grants via `staff_program_access`.
- **Preview as student** — a real permission restriction, not a cosmetic toggle.
- **Audit trail** — every staff access to learner PII is logged
  (`admin_access_log`).
- **Live course editing** — track names, instructors, dates, descriptions, and
  week summaries editable via `track_overrides` with no deploy; courses can be
  hidden/shown reversibly.
- **Program switcher** — super-admins manage any org from one login.
- **Security posture** — RLS on every table, own-row+staff read policy on
  learners, weekly automated Supabase security-advisor check reporting to Slack.

---

## Architecture (short version)

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) on Vercel |
| Database + Auth | Supabase (Postgres, RLS everywhere) |
| Styling | Tailwind CSS, per-org skin tokens (`--primary`/`--accent`) |
| Media | Vercel Blob (private) for session recordings |

Program detection: production host → `program-override` cookie (super-admin
switcher) → `x-program-slug` header → `program-slug` cookie. Org/course data is
DB-driven (`programs`, `track_overrides`, Organizations admin); the remaining
hardcoded TS configs are legacy and shrinking.

Roles and richer detail: `docs/access-control.md`. Design tokens: `DESIGN.md`.

---

## What We Call It

Externally: a **cohort program platform** (or "the operating system for cohort
programs"). Not "an LXP" and not "an LMS" — those invite feature-for-feature
comparison against content-delivery tools, which is the weakest slice of the
product. The competition we want to be compared against is a spreadsheet, a
Google Form, a Zoom account, and a part-time coordinator.
