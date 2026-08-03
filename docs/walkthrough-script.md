# BCC Academy Platform Walkthrough — Screen Studio Script

> Target length: 8 to 10 minutes. Each scene lists the URL to open, what to do
> on screen, and the lines to say. Speak the lines naturally; they're written
> for the ear, not the page.

## Before you record

- Log in as your master account, but do the learner scenes in a second browser
  profile logged in as a test student (or use Preview as student) so the
  learner portal shows a real learner view.
- Open `/platform` in a tab. It's your table of contents; every stop is one
  click from there.
- Close Slack and notifications. Hide bookmarks bar.
- In Screen Studio, use automatic zoom on clicks; the admin tables read better
  zoomed.
- Pick one course with real data for the deep dives (Security+ is the
  strongest right now: live cohort, sessions, recordings, surveys).

---

## Scene 1 — The opening (no screen yet, or the homepage)

**URL:** `bccacademy.io`

**Say:**

> This is BCC Academy. It's not a course library. It's a cohort program
> platform: the operating system for running a learning program end to end,
> and proving it worked.
>
> Five organizations run on this one platform today: Black Girls Code, Upskill
> Bahamas, Beyond Code Centers, Catalyst, and After The Game. Same codebase,
> five different brands. Let me show you the whole thing in about ten minutes.

---

## Scene 2 — How people get in

**URL:** `/quiz`, then `/apply/security-plus`, then `/join/bgc`

**Do:** Scroll the quiz briefly. Open the Security+ application, point at the
resume upload. Show a join link landing page.

**Say:**

> Everything starts with the front door. A career quiz for people who don't
> know where to start. Full applications for funded programs, with resume
> upload. And one-click join links for partners.
>
> Here's the part that matters: nobody on this platform ever types a password.
> Magic links and one-click invites only. A ten-year-old in a BGC camp and a
> fifty-year-old in a workforce program get the same door.
>
> And if a program sells tickets through Eventbrite, the webhook creates the
> account, allowlists the learner, and sends the welcome email automatically.
> Registration to enrolled student, no spreadsheet in between.

---

## Scene 3 — The learner portal

**URL:** `/dashboard` (as the test student)

**Do:** Land on the learner home. Point at the continue bar, What's New, and
the calendar links.

**Say:**

> This is what a learner sees. Their course, their next session, what's new,
> and calendar links that put class time on their phone.
>
> Notice what's not here: no feed, no gamification confetti, no clutter. Human
> in the lead. The page answers one question: what do I do next?

---

## Scene 4 — The classroom

**URL:** `/dashboard/track/<course>/<week>` (pick the Security+ current week)

**Do:** Show a session page: content, then the Zoom embed slot, then scroll to
a past session showing its recording. Show a submission or reflection field.

**Say:**

> This is the classroom. The live session runs right here, Zoom embedded in
> the page, signed joins under real names, so attendance tracks itself and no
> meeting link ever leaks.
>
> When the session ends, the cloud recording imports back onto the platform
> automatically, every hour. A past session shows its replay, right where the
> live class was. Nobody uploads anything.
>
> And the work lives with the lesson: submissions, reflections, instructor
> feedback, all attached to the same student record.

---

## Scene 5 — The admin engine

**URL:** `/dashboard/admin`

**Do:** Switch to the staff browser. Walk the admin home, open a course, flip
through Roster and Attendance. Then open Add People.

**Say:**

> Now the other side. This is where staff run the program, and the point is
> that program staff run it, not engineers.
>
> Every course shows its roster, attendance, and student work. Adding people
> is one panel: allowlist them, invite them, and watch the pipeline from
> invited to active.
>
> Course details, names, instructors, dates, week summaries: all editable
> live, no deploy. My team changes a course at 9pm on a Tuesday and it's live
> at 9:01.

---

## Scene 6 — Organizations (the money slide)

**URL:** `/dashboard/admin/organizations`

**Do:** Open the create-organization form. Fill it partway to show the fields.
Don't submit unless you want a demo org in prod.

**Say:**

> This is the newest piece, and honestly the one I'm most excited about. A
> whole organization, created from this form. Branding, its own courses, its
> own staff, its own learners. No deploy, no engineer.
>
> This is what makes the platform an offering and not just our internal tool.
> When a nonprofit or a workforce program wants to run their cohorts the way
> we run ours, this is their front door.

---

## Scene 7 — Proof: Insights and outcomes

**URL:** `/dashboard/admin/insights` and the course Surveys tab

**Do:** Open Survey Insights. Filter by cohort. Show the confidence-shift
panel and the diverging rating bars. Show the CSV/PDF export button.

**Say:**

> Here's the part funders care about, and the reason this platform exists.
>
> Every survey response is tagged to its cohort automatically, because it
> comes from enrollment, not from asking people to type their cohort name
> into a form. Pre and post confidence, measured in one sitting. Attendance,
> engagement, completions, all per learner, per course, per cohort.
>
> Every cohort that has finished on this platform finished at one hundred
> percent. Sixty-six learners started a finished cohort, sixty-six completed.
> When a funder asks what happened to the seats they paid for, the answer is
> this page, exported to CSV or PDF. Not an estimate. A record.

---

## Scene 8 — Trust: safety and compliance

**URL:** stay on admin, or show `/privacy` briefly

**Say:**

> Under the hood: row-level security on every table, an audit log of every
> staff access to student data, participation agreements tracked by cohort,
> COPPA-appropriate controls for the youth programs, and a weekly automated
> security scan that reports straight to Slack.
>
> We serve kids and we serve funded programs. Safety is not a feature tier.

---

## Scene 9 — The close

**URL:** `/platform-features` (let the counters land on screen)

**Say:**

> That's the platform. Five organizations, one codebase. The full loop from
> first click to verified certificate, and the receipts to prove it.
>
> We built this to run our own programs. Now it's ready to run yours. If you
> run cohorts and you're proving outcomes with a spreadsheet, a Google Form,
> and a Zoom account, let's talk.

---

## Cutting-room notes

- If you need a shorter cut (3 to 4 minutes), keep scenes 1, 4, 6, 7, and 9.
  That's the pitch: what it is, the classroom, the org builder, the proof,
  the ask.
- Scene 6: create a throwaway org in advance if you want to actually submit
  the form on camera, and hide it afterward.
- Scene 7: check the Insights numbers the morning you record; say what the
  screen shows, not what this script shows.
- The "100%" line must stay phrased as "every cohort that has finished,
  finished at 100%". In-flight cohorts like Security+ aren't counted, and
  someone sharp will notice if it's phrased as a flat completion rate.
