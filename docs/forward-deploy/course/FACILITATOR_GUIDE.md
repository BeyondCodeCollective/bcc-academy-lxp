# FACILITATOR_GUIDE.md — Running a Cohort

> For the person running the program, inside one organisation or across a
> mixed group from different industries. Learners never need this
> file. It covers the cohort schedule, what you do each week, where people get
> stuck, and how to report results to leadership.

## The shape

- **13 sessions** (0–12), about an hour each, self-paced in Claude Code.
- **5 weeks** for a cohort: a setup week plus the roadmap's four weeks.
- **Cohort size:** 3–6 for a pilot. Enough for peer demos, few enough to help.
- **Your time:** roughly 2 hours a week: one 45-minute group check-in, plus
  unblocking people over chat.
- **Cost per learner:** a paid Claude plan for the duration, plus their time.
  Check the current plan prices at claude.ai before you quote a figure.

## Cohort schedule

| Week | Sessions | Group check-in (45 min) | What "done" looks like |
|---|---|---|---|
| 0 | Homework, 0 | Kickoff: everyone reads out their Q1 and Q7 answers; the data rule; everyone installs live in the room | Everyone has Claude Code open in the course folder and has typed "hello" |
| 1 | 1, 2, 3 | Each person names their workflow and its owner in one sentence | `MY_DEPLOYMENT.md` filled in; discovery done with a real colleague |
| 2 | 4, 5, 6 | Each person states "where intelligence belongs" in two sentences; group pokes holes | First ugly agent loop runs on the practice emails |
| 3 | 7, 8 | Show one unhappy path each; swap failure lists | Twenty failure modes fixed, fenced or escalated |
| 4 | 9, 10 | Everyone reads out their number (hours, errors, days) | Eval run; deployment in a colleague's hands |
| 5 | 11, 12 | **Demo day.** Five minutes each, through the unhappy paths. Score with `RUBRIC.md` | Writeups published, handovers done, scores recorded |

Learners who fall behind: the sessions are self-contained, so let them catch
up rather than hold the group. The one thing that cannot slip is Session 10.
The deployment needs a week in someone else's hands before demo day.

## Before the cohort starts

1. **Get sign-off on the data rule.** Nobody puts real personal data
   about customers, clients, members, employees or anyone else into Claude
   Code. Whoever owns each learner's data approves the de-identified sample
   they will use from Session 6.
2. **Pick the workflows with people, not for them.** The best running example is
   one the learner does or watches every week, that annoys them, and that has a
   clear owner who will let them build on it. Reject anything that needs a new
   system or touches payroll, protected records (health, safeguarding, legal)
   or anything regulated the learner doesn't control.
   Mixed-industry cohort? That's a feature. A contractor and a restaurant
   manager will spot each other's load-bearing rules faster than colleagues do.
3. **Confirm plans and machines.** Each learner needs a paid Claude plan and a
   laptop they can install software on. Sort IT permissions before week 0.
4. **Book demo day now**, with the sponsor in the room. It makes week 4 real.
5. **Send `HOMEWORK.md` a week before kickoff.** The answers to Q1, Q3 and Q8
   tell you before day one whether each person has a workflow that can ship.

## What you do in each check-in

- Ask every person the one question in the table above. Two minutes each.
- Do not teach. The instructor teaches. You unblock and you keep the pace.
- Capture stuck points in a shared note. They become fixes to the course.
- End with the single thing each person will do before next week.

## Where people get stuck

| Symptom | Usual cause | What to do |
|---|---|---|
| Can't install, or Claude Code won't open the folder | IT restrictions, or they unzipped to Downloads and lost it | Do Session 0 in the room. Put the folder in Documents. |
| "I don't have a workflow" | They're thinking too big | Ask "what did you retype last week?" |
| Picked a workflow they don't own | Politics | Swap it in week 1. Later is expensive. |
| Agent does everything, learner is nervous | Skipped the authority question in Session 5 | Re-read `MY_DEPLOYMENT.md` "What it never does on its own" |
| Pasted real names into Claude Code | Forgot the rule under time pressure | Stop, note it, re-run with the synthetic data. Report it as you would any data incident. |
| Eval shows 30/50 and they're demoralised | They think the pass rate is the grade | Remind them: the failures are the deliverable. Investigate five together. |
| Colleague won't use it | Built for the demo; or it asks them to change tools | Death #1 or #2. Shrink the build until it lands in what they already use. |

## Reporting to leadership

After demo day, a one-page cohort report:

- How many started, how many completed (per `RUBRIC.md` criteria).
- One line per deployment: workflow, colleague using it, the number.
- Total hours per week now handled by agents, with the baseline.
- Rubric averages by row, so the next cohort's fixes are obvious.
- Quotes from the colleagues using the deployments, not from the learners.

The learners' one-page writeups are the appendix. That is the report; you
mostly staple it together.

## Testing the course before your first cohort

1. Do Session 0 and Session 1 yourself, cold, timing each. Anything over 75
   minutes needs trimming.
2. Have one non-technical colleague do Session 1 alone, no help. Watch where
   they stall. Fix that before anything else.
3. Run a three-person pilot on this schedule. Treat their demo day as the
   real test of the program, and take **that** to the CEO.
