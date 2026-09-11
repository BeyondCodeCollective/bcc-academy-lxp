# RUBRIC.md — Capstone Rubric and Completion Criteria

> Used by the facilitator (and the instructor, for self-assessment) at Session
> 12. Scores are 0–3 per row. A learner **completes the program** when every
> completion criterion below is met and the rubric total is **18 or more out of
> 27**, with no row scoring 0.

## Completion criteria (all required)

1. Sessions 0–12 marked completed in `progress.json`.
2. The deployment ran on **real work** (de-identified where needed) for at least
   **one week**, used by at least one colleague other than the learner.
3. A **one-page writeup** exists and has been shared with the sponsor: the broken
   workflow, what was built, what changed, the number.
4. A **five-minute demo** was delivered live to the facilitator or cohort and
   went **through** at least two unhappy paths.
5. A **handover** exists: a named person other than the learner can run it, and
   knows who to call when it misbehaves.
6. The data rule was never broken: no real personal data entered Claude Code.

## Rubric (0 = absent · 1 = weak · 2 = solid · 3 = exemplary)

| # | Dimension | What 3 looks like | What 1 looks like |
|---|---|---|---|
| 1 | **Business reality understood** | Writeup describes the real process (senders, exceptions, the veteran's rules), not the wiki version. Names the person who does it today. | Describes the process as a diagram nobody follows. |
| 2 | **Where intelligence belongs** | Smallest build that moves the most work with the least model authority. Clearly states what the agent decides and what it never does alone. | Agent does too much, or does so little it changes nothing. |
| 3 | **Seen the real inputs** | Built and tested on real (de-identified) inputs including the ugly ones. Death #1 avoided. | Built on the clean examples only. |
| 4 | **Works on top of what exists** | No migration. Output lands in the spreadsheet, inbox or system already in use. Death #2 avoided. | Requires people to change tools to benefit. |
| 5 | **Survives failure** | Twenty failure modes listed; each fixed, fenced or escalated. Audit trail exists; actions reversible. Death #3 avoided. | A handful of failures considered; no log. |
| 6 | **Measured** | 50 eval cases from real examples; every failure investigated; result stated in hours, errors or days. | Pass rate quoted with no failure analysis, or fewer than 25 cases. |
| 7 | **Owned** | Learner's name on it for 90 days; handover done; a colleague uses it without the learner present. Death #4 avoided. | Works only when the learner runs it. |
| 8 | **Moves a number** | Ties to revenue, risk or cost with a before and after the sponsor recognises. Death #5 avoided. | "Saves time" with no baseline. |
| 9 | **Defended like a VP** | Writeup and demo show before, after, number; demo goes through unhappy paths; no "audit", no "migration"; sponsor looks brilliant. | Demo of the happy path; jargon; learner is the hero. |

**Total: ___ / 27**

## Scoring notes for facilitators

- Score what was shipped, not what was intended. A modest agent that a
  colleague actually uses beats an ambitious one nobody runs.
- Rows 3, 5 and 6 are where most first-timers score low. That is fine at the
  pilot stage; record it and it becomes the next cohort's fix.
- If a learner scores 0 on row 7 (nobody else uses it), the program is not
  complete regardless of total. Ownership is the point.
- Record the total and one sentence of feedback in the learner's `PROGRESS.md`
  under **Capstone rubric score**.

## What the learner walks away with

A working AI agent on a real workflow in their organisation, in use by a
colleague · a one-page writeup they can show anyone · a five-minute demo they
have delivered · an eval report with a business number · a handover document ·
and the habit of asking "where does intelligence belong, and who owns the
result" before anyone buys anything.
