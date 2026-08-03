# Platform Walkthrough Plan — pages per user flow

> The recording plan: seven user flows, in order, each an ordered click path.
> Follow the pages top to bottom; what to show on each is in the right column.
> Record each flow as its own Screen Studio segment so you can trim or reorder.

## Setup

- **Browser A (staff):** logged in as your master account.
- **Browser B (learner):** logged in as a test student enrolled in Security+
  (or use Preview as student in Browser A).
- Keep `/platform` open in a tab in Browser A; every stop is linked from it.
- Demo course: **Security+** (live cohort, sessions, recordings, surveys).

---

## Flow 1 — Prospective learner discovers us (public, logged out)

| # | Page | Show |
|---|------|------|
| 1 | `/` | Homepage, the public face |
| 2 | `/quiz` | Career quiz, answer 2 or 3 questions |
| 3 | `/pathways/cybersecurity` | Pathway page: cert ladder, salaries |
| 4 | `/bcc/game-on` | Campaign landing page with embedded Eventbrite |
| 5 | `/survey/bcc-learner-intake` | Public walk-in survey, no account |
| 6 | `/help` | Help center |

## Flow 2 — Getting in (application → account, passwordless)

| # | Page | Show |
|---|------|------|
| 1 | `/apply/security-plus` | Funded-program application |
| 2 | `/apply/home-for-summer` | Second application, resume upload |
| 3 | `/join/bgc` | One-click join link landing |
| 4 | `/login` | Magic-link login, no password field anywhere |

## Flow 3 — Learner's week (Browser B, as the student)

| # | Page | Show |
|---|------|------|
| 1 | `/dashboard` | Learner home: continue bar, What's New, calendar links |
| 2 | `/dashboard/track/<securityplus-slug>` | Course overview, week list |
| 3 | `/dashboard/track/<slug>/<current-week>` | Live classroom: content + Zoom embed slot |
| 4 | `/dashboard/track/<slug>/<past-week>` | Past session showing its imported recording |
| 5 | Same page, scroll | Submission + reflection attached to the session |
| 6 | `/dashboard/survey/<survey-id>` | In-app survey, no name/email re-asked |
| 7 | `/dashboard/insights` | The learner's own analytics |
| 8 | `/dashboard/resources` | Resources + accessibility controls in the footer |

## Flow 4 — Instructor runs a session (Browser A or an instructor login)

| # | Page | Show |
|---|------|------|
| 1 | `/dashboard/admin` | Instructor-scoped admin: only their courses |
| 2 | Course → Attendance tab | Check-ins per session |
| 3 | Course → Submissions | Student work + leave feedback |
| 4 | Announcements panel | Post a track announcement |

## Flow 5 — Admin runs the program (Browser A)

| # | Page | Show |
|---|------|------|
| 1 | `/dashboard/admin` | Admin home: courses for the current program |
| 2 | Add People panel | Allowlist + invite pipeline, pending vs active |
| 3 | `/dashboard/admin/invites` | Bulk one-click invites |
| 4 | `/dashboard/admin/registrations` | Eventbrite registrations feeding accounts |
| 5 | `/dashboard/admin/programs` | Manage Courses: live edits, hide/show |
| 6 | `/dashboard/admin/landing` | Landing-page builder |
| 7 | Students → Certificates | Issue one / issue all, email later |
| 8 | Program switcher (top bar) | Jump to another org, same login |

## Flow 6 — The platform as a product (the money flow)

| # | Page | Show |
|---|------|------|
| 1 | `/dashboard/admin/organizations` | Create an organization form: no deploy |
| 2 | `/dashboard/admin/staff` | Staff roles + cross-program access grants |
| 3 | Switch into the new/demo org | Same chassis, different skin |

## Flow 7 — Proving it worked (funder view)

| # | Page | Show |
|---|------|------|
| 1 | `/dashboard/admin/insights` | Survey Insights: cohort filter, confidence shift |
| 2 | Course → Surveys tab | Response rates, diverging rating bars |
| 3 | `/dashboard/admin?tab=analytics` | Engagement funnel: invited → activated → active |
| 4 | CSV / PDF export button | The funder deliverable |
| 5 | `/certificate/<id>` (incognito) | Public verifiable certificate, no login |
| 6 | `/dashboard/admin/agreements` | Signed agreements by cohort |
| 7 | `/privacy` | Self-serve data rights |

---

## Order for the full video

Flows 1 → 2 → 3 → 5 → 6 → 7 (skip 4 unless you want the instructor angle;
it overlaps with 5). Short cut: Flow 3, Flow 6, Flow 7.

## Reminders

- Say the completion stat as "every cohort that has finished, finished at
  100%" (66/66). Never a flat completion rate; Security+ is mid-flight.
- Check Insights numbers the morning you record; describe what's on screen.
- Don't show the People tab zoomed on real learner emails; blur or use the
  demo org roster.
- If you submit the Organizations form on camera, use a throwaway org and
  hide it after.
