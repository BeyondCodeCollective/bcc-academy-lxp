# Analytics audit, 2026-08-18

Scope: every number the platform shows to admins, staff, or partners. Code at `e13ba7d`; prod DB read-only on 2026-08-18 (243 students, 263 enrollments, 530 attendance rows, 87 certificates, 10,031 activity_events). Query scripts used for the evidence are reproducible from the row counts quoted; nothing was written.

## Executive summary

Overall trust: **medium for headcounts, low for anything that says "finished", "progress", or "attended" on a DB-built course.** The canonical-definitions work (`engagement.ts`, `compute.ts`, the set-based completion rate) held up: no metric can exceed 100% any more, and "engaged" means the same thing on every screen. But two upstream defects poison a lot of downstream numbers.

Three worst problems:
1. **Zoom attendance sync writes the previous session's roster into the upcoming session.** The 04:00 UTC cron treats "today" (ET) as due, the session has not happened yet, and Zoom's numeric meeting id resolves to the *last* occurrence. Every cron-synced course (Security+, Home for the Summer, MASS/Sec+, AI Entrepreneurship, Endless day 3, Network+ BTG) has attendance for session N that is really N-1. Security+ session 10 (tonight, 6:30 PM ET) already shows 12 present. Turnout, full attendance, certificate eligibility, "who's missing class", and the risk model all inherit this. **P0.**
2. **Progress and completion assume every DB-built course is 8 weeks long.** `progress.ts` and `actions-courses.ts` read `totalWeeks` from the TS registry only, defaulting to 8. Security+ is 19 sessions, so 12 of 13 learners already read as "Finished" (92%) at session 10, and the Progress tab tells staff to issue their certificates. Home for the Summer (6 days) can never pass 75% progress; Endless (3 days) reads 0 finished. **P0.**
3. **"Active" and "Last active" still lean on `last_seen_at`** in the Engagement table/CSV, the People roster pill, the Overview "Active 7d" tile, and the daily snapshot cron. Login is not activity, and the column is stamped at signup, so any recent cohort reads 100%. This is the trap that already misled a partner. **P0 wherever it is exportable.**

Three highest-value fixes (all S/M effort):
1. Fix the Zoom cron to sync only *yesterday's* units (or target the occurrence by date), add a `source` column, and run a one-off migration that shifts cron-written rows back one session.
2. Make `progress.ts` / `actions-courses.ts` read course length from `track_overrides` (via `resolveScopeTrackSlugs`-style merge), and define "finished" as *counted units attended >= units held*, not "furthest week reached".
3. Retire `last_seen_at` from every learner-facing metric: rename the column "Last login" where it must stay, source "Last active" from `activity_events`/`last_activity_at`, and drop the login fold-in from the Overview "Active 7d" tile (or fix its hint).

## Metric inventory

Legend: verdict = correct / mislabeled / wrong / untrustworthy-input. Severity: P0 would mislead a funder, P1 wrong for staff, P2 cosmetic or unclear, P3 nice-to-have.

| # | Metric | Where shown | Source | Verdict | Sev |
|---|---|---|---|---|---|
| 1 | Sessions attended per session, avg turnout, full attendance, "Who's missing class" | Course tab → Analytics (`CourseEngagement`) | `src/lib/course-engagement.ts:262-330` from `attendance` | untrustworthy-input (Zoom shift, F1) | P0 |
| 2 | Attendance % badge per learner, "N/held sessions" | Course tab → Students roster | `admin/page.tsx:523-543`, `admin-tabs.tsx:2395-2409` | untrustworthy-input (F1) | P0 |
| 3 | Certificate eligibility (attended every held session) | Certificates panel | `actions-misc.ts:290+` | untrustworthy-input (F1) | P0 |
| 4 | Weekly attendance rate, "Avg attendance", "Need a check-in" | Analytics → Attendance (`attendance-tab.tsx:500-520`) | `compute.ts` `weeklyAttendanceRates` / `summarizeAllStudents` | untrustworthy-input (F1) + denominators disagree (F11) | P0 |
| 5 | Program turnout per course, "Every learner, every session held" grid | Analytics → Attendance (`program-attendance.tsx`) | `compute.ts` | untrustworthy-input (F1) | P0 |
| 6 | Finished the course, Finish rate, per-course finished % | Analytics → Progress (`courses-dashboard.tsx`) | `actions-courses.ts:150-175` | wrong (F2: 8-week default; F5: position not count) | P0 |
| 7 | "X% of the way through", Progress by track, Still active by week | /dashboard/insights Overview (`outcomes-dashboard.tsx:104-186`) | `progress.ts:126-140` dropoff | wrong (F2) | P0 |
| 8 | Completion rate, Completed so far, median days to complete | Overview `SectionHeadline` sub | `progress.ts` | correct math (clamped, set-based); denominator misses `is_staff` (F6) | P1 |
| 9 | Keeping up % (per learner) | Analytics → Progress table | `actions-courses.ts:216-236` (`heldBySlug`, TS-only) | wrong for DB courses (F2) | P1 |
| 10 | Progress distribution donut | Analytics → Progress | `actions-courses.ts:150-165` | wrong for DB courses (F2) | P1 |
| 11 | Last active (table + CSV) | Analytics → Engagement | `actions-analytics.ts:317` = `last_seen_at` | mislabeled (F3) | P0 (exported) |
| 12 | Active / Joined pill, "Last login" line | People roster | `admin-tabs.tsx:2445-2467` | mislabeled: pill says Active for anyone who ever logged in (F3) | P1 |
| 13 | Active 7d | /dashboard/insights Overview | `insights/page.tsx:104-121` | mislabeled: hint says "attendance, submission, or reflection", value includes login (F3); ATG today: 8, of which 7 login-only | P1 |
| 14 | Students (Overview tile), Students per track, Students by phase | /dashboard/insights | `lib/insights-data.ts` (program_id scope, no `is_staff`) | wrong membership vs every admin surface (F7); phase donut skips the learner filter (F7) | P1 |
| 15 | Engaged ever % | /dashboard/insights | `insights/page.tsx:125-141` | same membership problem (F7): ATG 18% here vs 36% on Engagement tab | P1 |
| 16 | invited → created account → engaged funnel | Analytics → Engagement | `actions-analytics.ts:212-260` | correct as defined; "invited" is allowlist-only so direct-adds break it (Centers: 6 → 23, capped) (F12); course drill-down "engaged" counts other-course activity (F13) | P2 |
| 17 | Active learners / Sessions attended / Work submitted with period delta | Analytics → Engagement `TrendsRow` | `actions-analytics.ts:340-455` | math correct; two cards show the wrong (i) definition (F14); Zoom rows carry cron time not join time (F1b) | P2 |
| 18 | Videos / Attended / Submitted / Surveys per learner | Analytics → Engagement table + CSV | `actions-analytics.ts` | correct; "Videos" is a self-report button, not playback (F15) | P2 |
| 19 | Active this week, Not started, Where learners stand, heatmap | Course tab → Analytics | `course-engagement.ts:333-395` | correct; heatmap dates Zoom rows on cron day (F1b); no `is_staff` (F6) | P2 |
| 20 | "N / M active" and "N / M completed" on the course list | Admin home | `admin-tabs.tsx:1181-1240`, `getCourseRosterStats` | mislabeled: "completed" = full attendance (F16); no `is_staff` (F6) | P1 |
| 21 | Engagement /100 score | People roster expanded row | `admin/page.tsx:432-458` | wrong denominator: `maxWeeks` = longest course in program (F17) | P1 |
| 22 | Signed up → Onboarded → Activated → Active (7d) funnel; Invited → Accepted | Overview | `acquisition.ts:112-140` | correct; membership by `program_id` differs from other tabs (F7) | P2 |
| 23 | Engagement risk donut, "N learners need a check-in", Needs attention | Overview | `acquisition.ts:150-205` | wrong for ended/hidden courses: BGC shows 90 learners needing a check-in for two finished bootcamps (F8) | P1 |
| 24 | Responses, Respondents, Forms answered, Responses over time | Analytics → Surveys | `insights-data.ts`, `insights-dashboard.tsx` | correct counts; `hfs-pre-survey` (22) is intake data (F9); no staff filter on responses (1 staff row today) | P1 |
| 25 | Response rate per survey ("N of M answered") | Course tab → Surveys | `admin/page.tsx:630-660`, `track-insights-section.tsx` | correct (learners only, `is_staff` excluded) | fine |
| 26 | What changed (before/after shift), avg delta, respondents | Overview + Surveys | `outcomes.ts`, `shift.ts` | correct guards (n>=3, orientation); cross-survey pair is cohort-level with 16 pre vs 5 post (F18) | P2 |
| 27 | Pathway / archetype composition | Overview | `outcomes.ts:fetchComposition` | 0 rows in `assessment_results`; renders nothing | fine |
| 28 | Alumni (unique by email) | Overview | `insights-data.ts` | correct (374 rows → unique) | fine |
| 29 | Watched / submitted grid | Course tab → Students → Progress (self-paced) | `actions-progress.ts` | correct (raw) | fine |
| 30 | Exam attempted N of M | Course tab → Surveys | `admin/page.tsx` | correct | fine |
| 31 | total_accounts, active_1d, active_7d, video_views_total | `analytics_daily_snapshots` (cron) | `api/cron/daily-snapshot/route.ts` | wrong (login = active, staff/tests included) and **never read** (F10) | P2 |
| 32 | One-sheet: "98% / 100% active in last 30 days", "verified check-ins", "tracked actions" | `public/reports/lxp-programs-one-sheet.html` | hand-built 2026-07-14 | mislabeled: 30-day active = last login; "instructor-verified" check-ins were mostly embed self-joins (F3, F1) | P0 (external) |

## Findings

### F1. Zoom attendance sync writes session N-1's roster into session N (P0)

**What's wrong.** `src/app/api/cron/zoom-attendance/route.ts:41-46` builds `todayKeys` = {today ET, yesterday ET} and syncs every unit dated either day. The cron runs at `0 4 * * *` UTC (`vercel.json`), i.e. 00:00 ET, so "today" is always the *pre-session* day. `syncZoomAttendanceForSession` (`src/lib/attendance/zoom-sync.ts:70-77`) calls `getPastMeetingParticipants(parsed.meetingNumber)` with the numeric meeting id, and `src/lib/zoom-report.ts:66-71` documents that a numeric id "resolves to Zoom's LATEST occurrence". At midnight before session N, the latest occurrence is session N-1. Rows are upserted with `checked_in_at` = default now() (`zoom-sync.ts:122-136`), so they also carry the cron time, not the join time.

**Evidence (prod).** Every cron-written row (`marked_by IS NULL`, 276 rows) is stamped `T04:00Z` on the session's own date, never the day after:

```
comptia-security s6   zoom 2026-07-28T04Z ×13 | embed self 2026-07-28 ×1   (session 6:30 PM ET 07-28)
comptia-security s7   zoom 2026-07-30T04Z ×13 | self 07-30 ×1
comptia-security s8   zoom 2026-08-11T04Z ×10 | self 08-11 ×3
comptia-security s9   zoom 2026-08-13T04Z ×12 | self 08-13 ×1
comptia-security s10  zoom 2026-08-18T04Z ×12 | (session is tonight; already 12 "present")
home-for-summer  s3   zoom 2026-08-11T04Z ×18 | self 08-11 ×4   (session 11:00 AM ET)
home-for-summer  s4   zoom 2026-08-12T04Z ×21 | self ×2
home-for-summer  s5   zoom 2026-08-13T04Z ×18 | self ×2
home-for-summer  s6   zoom 2026-08-14T04Z ×17 | self ×1
```

For Security+ sessions 6-10, 100% of the Zoom-written attendees for session N were present in session N-1, and 0% of them also embed-joined session N. Reconstructing (session N's true Zoom roster = the rows written for N+1): true s6=13, s7=10, s8=12, s9=12; recorded s6=14, s7=14, s8=13, s9=13. Recorded turnout never drops because it is a union of two sessions.

**Impact.** Every attendance-derived number (inventory rows 1-5, 20, 23) over-counts for cron-synced courses. Home for the Summer, the program most likely to be quoted to a funder this month, has days 3-6 built on the prior day's roster. Security+ certificate eligibility will be inflated by session 19.

**Fix.**
- `zoom-attendance/route.ts`: sync only units dated *yesterday* ET (drop `easternDayKey(now)` from `todayKeys`), or better, list `/past_meetings/{id}/instances` and pick the occurrence whose `start_time` falls on the unit's date, then fetch by occurrence UUID.
- `zoom-sync.ts`: set `checked_in_at` from the participant's `joinTime` (already fetched, currently discarded) and add a `source` column (`embed` / `zoom_report` / `manual`) instead of overloading `marked_by`.
- One-off migration: for cron-written rows (`marked_by IS NULL AND checked_in_at::time = '04:00'`), move them back one unit and delete phantom rows for units whose date is in the future (Security+ s10 today).
- Sentinel check: "attendance rows for a unit dated in the future" and "cron-written rows for unit N identical to unit N-1".

### F2. Progress, finish rate, and "keeping up" assume 8 weeks for every DB-built course (P0)

**What's wrong.** `src/lib/analytics/progress.ts:78-84` builds `meta` from `getEveryProgramConfig()` (TS registry only, `src/lib/programs/index.ts:90`) and falls back to `totalWeeks ?? 8` (line 126). `src/app/dashboard/admin/actions-courses.ts:96-107` does the same for `weeksBySlug` and `heldBySlug`, and `fractionFor` (line 143) marks a pair 100% when `furthest >= weeks`. Every course created through the admin builder (the correct architecture per `track_overrides`) is absent from the TS registry: comptia-security (19), home-for-summer (6), mass-secplus (8), endless-virtual-bootcamp (3), ai-entrepreneurship-high-school-cohort (4), network-plus-btg (24), tech-and-ai-hangout (8), digital-life-skills (6), workplace-safety-fundamentals (6), wisdom-circle-replit (1).

**Evidence (prod, reproducing the code).**

```
comptia-security   true 19 sessions, code assumes 8
  furthest-unit distribution: w7:1 w10:12
  finished(code) 12/13 = 92%   finished(true) 0     dropoff(code) 100,100,100,100,100,100,100,92 → "99% of the way through"
home-for-summer    true 6 days, code assumes 8
  finished(code) 19 (all via certificates)   reached last day by content: 17/21
  dropoff(code) 100,100,100,100,86,81,0,0 → "71% of the way through" for a program that is over
endless-virtual-bootcamp  true 3 days, code assumes 8
  finished(code) 0/34   reached day 3: 19/34   dropoff(code) 91,76,56,0,0,0,0,0 → "28%"
```

The Progress tab's "Finished the course" tile then hints "N certificates issued so far — issue the rest from the course's Students tab" (`courses-dashboard.tsx:44-52`), which today asks staff to certify Security+ learners at session 10 of 19.

**Fix.** Give `progress.ts` and `actions-courses.ts` a merged length map: read `track_overrides.total_weeks` (and `week_summaries` for `countedUnits`) for the scope's slugs, overlaying the TS config, in one helper next to `resolveScopeTrackSlugs` in `src/lib/programs/scope.ts`. Never default to 8; if length is unknown, report progress as "n/a" rather than a fraction (trust rule 5).

### F3. "Active" and "Last active" still mean "last login" in several places (P0 where exported)

**What's wrong.** `students.last_seen_at` is written only in the auth callback (`src/app/auth/callback/route.ts:440,568`), so it is stamped at signup and on each magic-link login. In prod, 73 of 243 accounts have `last_seen_at` on the same day as `created_at`; for a fresh cohort it is 100%.

Where it leaks:
- `actions-analytics.ts:317` `lastActive: s.last_seen_at` → the Engagement table column "Last active" and the CSV column "Last active" (`analytics-dashboard.tsx:263, 337`). This CSV is the artifact staff hand to partners.
- `admin-tabs.tsx:2467` `StatusPill status={(s.last_activity_at ?? s.last_seen_at) ? "active" : "joined"}`: every account that ever logged in is "Active", forever.
- `dashboard/insights/page.tsx:114-120` folds `last_seen_at` into "Active 7d" while the tile hint (line 296) says "attendance, submission, or reflection". ATG today: 8 active, 7 of them login-only.
- `api/cron/daily-snapshot/route.ts:52-58`: `active_1d/7d` are login counts (see F10).
- `admin-tabs.tsx:1107-1118` home-tab fallback (only when server stats are missing).
- One-sheet: "98% active in last 30 days" (Roblox), "100% active in last 30 days" (Forte). Today the same query gives Roblox 1/58 (2%) and ai-literacy 15/39 (38%); HFS reads 100% because everyone enrolled within 30 days.

**Fix.** (a) Rename every `last_seen_at`-backed label to "Last login" (table, CSV, roster line). (b) Source "Last active" from `max(activity_events.created_at, last_activity_at)` which is now reliably written (`src/lib/auth/session.ts:81-98`; 137 of 217 learners have it). (c) Overview "Active 7d": either drop the login fold-in or change the hint to "any activity, including sign-in". (d) Add a lint-style guard: grep CI for `last_seen_at` outside auth/session code.

### F4. The one-sheet's "verified check-ins" claim does not match provenance (P0, external)

`public/reports/lxp-programs-one-sheet.html` footer: "Check-ins are instructor-verified live-session attendance." Prod provenance: 251 rows `marked_by = student` (embed auto-join or manual self check-in), 276 `marked_by NULL` (Zoom report cron, see F1), 3 by a super_admin. Roblox's 151 "verified check-ins" are 95 report-imported + 56 self. Nothing was instructor-verified. Any re-issue of this sheet should say "platform-recorded check-ins (Zoom join or embedded player)". Also "126 active learners" on the sheet is an account count.

### F5. "Finished" is a position, not a count (P1)

`actions-courses.ts:143` and `progress.ts` treat "reached the last unit" as finished. A learner who attended only the final session reads 100%; one who attended 5 of 6 reads 83%. `METRIC_DEFS.courseFinished` says "reached the end of their course", which is honest about the definition but not what a funder hears in "finish rate". Once F2 is fixed, define finished as `countedUnitsAttended >= ceil(0.8 * unitsHeld)` or reuse `summarizeStudent().rate`, and say the threshold in the (i).

### F6. `is_staff` is filtered inconsistently (P1, latent)

The three-flag rule (`role='student' AND NOT is_test AND NOT is_staff`) is applied in `actions-analytics.ts`, `actions-courses.ts` (student list), `acquisition.ts`, `insights-data.ts` (course scope), `admin/page.tsx` (surveys, engagement score), and Sentinel check 2. It is **missing** in:
- `progress.ts:66-72` (`role === "student" && !is_test`)
- `course-engagement.ts:73, 234` (`getCourseRosterStats`, `getCourseEngagement`)
- `lib/insights-data.ts:29-34` (Overview "Students")
- `attendance-tab` / `program-attendance` (receive `students.filter(role === "student")`)
- Survey response counting (`actions-surveys.ts` `getDashboardSurveyStats`): 1 staff `hfs-impact-survey` row counts today.

Prod today: 4 accounts are `role='student', is_staff=true` (2 @wearebgc.org, 2 @fpl.com); none is enrolled in a track, so no live number differs yet. It will the day one is enrolled. `actions-courses.ts` already mixes the two denominators: `totalEnrolled` comes from `progress.ts` (no `is_staff`), `finishedRate` from its own `enrolledPairs` (with `is_staff`).

**Fix.** One `isLearner(row)` predicate in `src/lib/analytics/engagement.ts` (or a `learners` view / RPC) and a `.select("id, role, is_staff, is_test")` everywhere; Sentinel already knows the rule, so add "analytics query without is_staff" to the code-review checklist.

### F7. The Overview page uses a different membership rule than every admin tab (P1)

`lib/insights-data.ts` scopes students by `students.program_id` and activity tables by their `program_id` stamp; the admin surfaces moved to slug-based membership because apex signups stamp Catalyst (`scope.ts:14-20`). 17 enrollments today sit under a different program than the track's owner (5 catalyst→mass, 5 catalyst→techplus, 3 catalyst→ai-entrepreneurship, 2 catalyst→endless, 2 forte→mass/techplus). Result for Beyond the Game: Engagement tab 14 learners / 36% engaged; Overview 11 students / 18% engaged. Catalyst: 56 vs 59 (staff-role accounts). Also `insights/page.tsx:187-193` builds the phase donut from `studentTracks` without the `studentIds` learner filter that the per-track chart applies three lines earlier, so staff/test enrollments count in "Students by phase" (mass/techplus each carry 4 staff enrollments).

**Fix.** Have `fetchAllInsightsData` take `resolveScopeTrackSlugs(scope)` and filter by slug like everything else; apply `studentIds.has()` in the phase loop.

### F8. Risk model has no notion of "course ended" or "course hidden" (P1)

`acquisition.ts:76-80` builds `liveBySlug` from `getProgram()`, which is hidden-filtered (`programs/server.ts:36-40`). Learners whose only live courses are hidden fall to recency scoring (`acquisition.ts:180-190`), and recency has no end-date guard. All BGC courses are hidden and both bootcamps have ended, so today the BGC Overview scores 90 learners by recency: 33 "Check in" + 57 "Inactive", headline "90 learners need a check-in". Roblox (rate model when visible) would read on-track forever after ending. Neither is a useful signal after the last session.

**Fix.** Exclude learners whose every enrolled course is `phase === "ended"` (or past its last dated unit) from risk buckets, count them separately as "completed cohorts", and use `getProgramWithOverrides` here so hidden-but-live courses keep the rate model, matching the explicit policy in `actions-analytics.ts:99-104`.

### F9. `hfs-pre-survey` rows are intake answers, and HFS has no confidence baseline (P1)

Confirmed: 22 `survey_responses` rows tagged `hfs-pre-survey` contain only intake keys (`gender, consent, languages, disability, ai_experience, device_access, race_ethnicity, household_income, employment_status, first_gen_college, ...`); 21 of the 22 respondents are HFS enrollees and none of them has a `bcc-learner-intake` row. `schemas.ts:1372-1376` documents the cause. Consequences today: Survey Insights shows a "Home for the Summer Pre-Survey" section with 22 responses and no answers per question, "Forms answered" is +1, the HFS demographics are invisible under "Learner Intake", and the pre→post shift for HFS cannot exist (`hfs-impact-survey` has 2 rows, 1 by staff). The re-tag task is known; add to it: re-tag to `bcc-learner-intake` with `program_variant` preserved, and label the HFS impact survey as retrospective (it asks BEFORE/AFTER in one sitting) wherever a delta is shown.

### F10. Daily snapshots are wrong and never read (P2)

`api/cron/daily-snapshot/route.ts` writes one row per program per day (262 rows so far) with `total_accounts` = all accounts incl. admins/staff/tests, `active_1d/7d` = login recency, `video_views_total` = all `week_progress` rows including unwatched. No code reads `analytics_daily_snapshots`. Either delete the cron or make it snapshot the canonical numbers (learners, engaged, active-by-activity, finished, certificates) so cohort history becomes answerable (see Missing data).

### F11. Attendance denominators disagree between the tile and the per-learner rate (P2)

`weeklyAttendanceRates` (`compute.ts:172-189`) counts every *scheduled* counted unit against the current roster; `summarizeStudent` (`compute.ts:210-243`) counts only units where someone was marked. A scheduled session with a failed Zoom sync reads 0% in the weekly boxes and "Avg attendance" but is invisible in "N/expected". `CourseEngagement.avgTurnout` (`course-engagement.tsx:117-124`) uses a third denominator: held sessions × today's roster, so late enrollments lower early sessions' turnout. Pick one (units held × roster-at-the-time is the honest one) and state it in the (i).

### F12. "Invited" is allowlist-only, so direct adds invert the funnel (P2)

`actions-analytics.ts:236-246`: Beyond Code Centers reads invited 6 → created 23 (capped to 100%). `docs/analytics-plan.md` already decided to backfill direct-adds into `allowed_signup_emails`; not done. Until then show "—" instead of a percentage when created > invited.

### F13. Course drill-down "engaged" counts activity in other courses (P2)

`actions-analytics.ts:154-163` narrows `studs` to the course roster but `watchedSet/attendedSet/submittedSet` (lines 264-268) are built from all tracks. A Security+ learner who only attended MASS/Sec+ counts as engaged in the Security+ drill-down. Filter the four row sets by `activeCourse` when set.

### F14. Two headline cards carry the wrong definition (P2)

`analytics-dashboard.tsx:56-57`: "Sessions attended" and "Work submitted" pass `key: "activeStudents"`, so their (i) reads "Members with any activity in the window...". Add `sessionsAttended` / `workSubmitted` entries to `METRIC_DEFS` (`metric-defs.ts`).

### F15. "Videos / Lessons watched" is a self-report button (P2)

`src/app/dashboard/track/actions.ts:275-300` `markVideoWatched` writes `video_watched_at` on a button click and logs `video_progress` with `percent: 100` always. Re-clicking overwrites the timestamp, which moves the watch into the current period for `getEngagementTrends`. Label it "Marked watched" or instrument the player.

### F16. Course list says "completed" for full attendance (P1)

`admin-tabs.tsx:1183-1186, 1229-1233`: for an ended course the row shows `fullAttendance / count completed`. `fullAttendance` = present at every held session (`course-engagement.ts:170-176`), which after F1 is inflated and is in any case not "completed" (certificates are). Roblox today: 36 full-attendance vs 58 certificates. Say "attended every session" or show certificates.

### F17. Per-learner /100 engagement score is scored against the longest course in the program (P1)

`admin/page.tsx:434`: `maxWeeks = Math.max(...program.tracks.map((t) => t.totalWeeks))`. A Home for the Summer learner (6 days) in Catalyst is scored against Security+'s 19: perfect attendance = 6/19 × 25 = 8 of 25 points. Score each learner against the units held in the courses they are enrolled in.

### F18. Cross-survey shift is 16 pre vs 5 post (P2)

`shift.ts` `CROSS_SURVEY_PAIRS` pairs `pre-survey-spring-2026` (17 responses) with `post-survey-spring-2026` (5). The n>=3 floor passes, the label says "cohort-level", but a funder reading "confidence rose X" will not see that the post sample is 5 people who may not be the pre respondents. Show both n's on the row (`ShiftRow.n` is the max today) and suppress when post n < 8 or < 30% of pre.

### F19. Hidden-course policy is implicit and differs by surface (P2)

Engagement/Progress/Courses count hidden courses (explicit comment in `actions-analytics.ts:99-104`; implicit in `resolveScopeTrackSlugs`); the Overview page names tracks from the hidden-filtered `getProgram()` so a hidden course's learners appear under a raw slug and phase "other"; Acquisition drops hidden courses from the live model (F8); course roster stats exclude them. Write the policy once ("analytics always count hidden courses; navigation never shows them") and pass `getProgramWithOverrides` to every analytics fetcher.

### F20. Sentinel and the code disagree on the completion-rate story (info)

The previously flagged ">100% completion" is fixed: `progress.ts:107-113` intersects completers with the enrolled set and clamps; prod has 1 `track_completions` row for a non-enrolled super_admin (home-for-summer) and it is correctly excluded. Sentinel check 3 ("finished courses with no certificates") is the right nudge; keep it.

## Dead data and missing data

**Collected, never surfaced**
- `analytics_daily_snapshots` (262 rows, no reader; F10).
- `activity_events` beyond a 7-day/12-week activeness signal: 1,114 logins, 7,708 page_views, 992 `session_join`, 37 `survey_complete`, 67 `certificate_issued`. Only `course-engagement.ts` reads the table (`.gte(created_at)` for activeness). No logins-over-time, no time-in-platform, no session_join vs check-in reconciliation, no per-page dwell.
- Zoom participant `joinTime` and `durationSeconds` are fetched (`zoom-report.ts:104-118`) and dropped in `zoom-sync.ts`. Minutes-in-session per learner is sitting in the API response.
- `attendance.marked_by` provenance (self / report / admin) is never shown; the roster cannot say "Zoom-verified".
- `students.zip` (81 set), `date_of_birth` (94), `state` (0): exported per row in the Engagement CSV, never aggregated (age band, ZIP cluster). `state` is never populated.
- `tutor_messages` (16): only an activeness signal; no topic/volume view.
- `invites.used_at`: only the Overview invite funnel; no time-to-accept.

**Surfaced, but the input cannot carry the weight**
- Attendance (F1, F4): union of report + embed join + occasional manual mark, with no source flag and one systematic shift.
- "Videos watched" (F15): a button.
- `last_seen_at`-based activity (F3).
- Confidence shift for HFS (F9): no baseline; post n=1 real.

**What a funder will ask that we cannot answer today**
- Completion by cohort with a stated rule (attended >= X% of sessions), across cohorts over time. Needs F2/F5 and a snapshot store (F10 repurposed).
- Attendance in minutes / partial attendance. Needs the discarded Zoom durations.
- Pre/post confidence delta per learner (paired), not cohort means. Needs identity on the public survey path or auth-only pre/post; today only same-survey retrospective (Network+ n=24) is paired.
- Time on task. Nothing collects duration; page_view has no heartbeat.
- Demographics at program level (gender, race, income, first-gen). Exists only inside individual survey sections and only for surveys that carry `SHARED_DEMOGRAPHICS`; HFS's 22 are mislabeled (F9); no roll-up across surveys.
- Employment / placement / credential outcomes. Not modeled anywhere.
- Retention across programs (Network+ → Security+ continuation): the one-sheet claims 75% from `alumni_enrollments`; no view computes it.

## Recommended improvements, ranked

| # | Improvement | Type | Value | Effort | Depends on |
|---|---|---|---|---|---|
| 1 | Fix Zoom cron day selection + occurrence targeting; add `attendance.source`; migrate cron-written rows back one unit; delete future-dated rows | fix wrong number | Funders: attendance is the headline claim for live programs | M | Zoom `instances` endpoint access |
| 2 | Merge `track_overrides.total_weeks` / dated units into progress + courses analytics; never default to 8 | fix wrong number | Funders: "finished %" and "progress %" | S | none |
| 3 | Redefine "finished" as units attended >= threshold; state threshold in (i) | fix wrong number | Funders | S | #2 |
| 4 | Retire `last_seen_at` from Engagement table/CSV, roster pill, Overview Active 7d; rename to "Last login" where kept | fix mislabel | Funders (CSV is handed out) | S | none |
| 5 | Single `isLearner` predicate (`role`, `is_test`, `is_staff`) used by every fetcher; Overview page on slug membership | fix wrong number | Staff (numbers reconcile across tabs) | S | none |
| 6 | Risk model: exclude ended cohorts, use unfiltered program for live-track detection | fix wrong number | Staff (kills false "90 need a check-in") | S | none |
| 7 | Re-tag `hfs-pre-survey` → `bcc-learner-intake`; label HFS impact as retrospective | fix wrong number | Funders (HFS demographics + honesty of the delta) | S | migration approval |
| 8 | Repurpose daily snapshot to store canonical learner/engaged/active/finished per course per day | new capability | Funders: cohort trend, retention over time | M | #2, #5 |
| 9 | Persist Zoom `joinTime`/`durationSeconds`; show minutes attended and "Zoom-verified" badge | new capability | Funders: partial attendance, verification claim | M | #1 |
| 10 | Program-level demographics roll-up across intake surveys + `students.zip/dob` (age bands), with n and coverage % | new capability | Funders | M | #7 |
| 11 | Paired pre/post: require auth for post surveys of enrolled cohorts (already the rule per memory), compute per-learner deltas, show both n's | new capability | Funders | M | none |
| 12 | Course-scoped engaged (F13), correct (i) keys (F14), "attended every session" label (F16), /100 score denominator (F17), invited "—" when inverted (F12) | fix mislabel | Staff | S | none |
| 13 | Instrument video playback (or rename to "Marked watched") | fix mislabel / new | Staff | S/M | none |
| 14 | Regenerate the one-sheet from a script that runs the canonical fetchers, with the trust-contract footnotes baked in | new capability | Funders | M | #1-#5 |

## Proposed trust contract

Rules every surfaced metric obeys; enforceable in code review and, where noted, in code.

1. **Learner = `role='student' AND NOT is_test AND NOT is_staff`.** One predicate (`isLearner`) in `src/lib/analytics/engagement.ts`; every `.from("students")` in an analytics module selects the three columns and applies it. Sentinel check 2 already encodes it; a unit test asserts every fetcher passes it.
2. **Membership is by track slug, never by `program_id` stamp.** `resolveScopeTrackSlugs` is the only scope resolver; the Overview page joins it.
3. **Course length and schedule come from the merged config** (`track_overrides` over TS). Any fetcher that needs `totalWeeks`, `weekSummaries`, or `phase` gets them from one helper; `?? 8` is banned.
4. **Denominator is stated on the surface** (hint or (i)): "of N enrolled learners", "of N sessions held", "of N respondents". A percentage with no visible denominator does not ship.
5. **No silent zeros or silent defaults.** Unknown renders "—". Telemetry-backed metrics carry a "since 2026-06-29" caveat; attendance carries its source mix; anything derived from `last_seen_at` is labeled "login".
6. **Hidden courses always count in analytics and never appear in navigation.** Analytics fetchers take `getProgramWithOverrides`; display layers filter names.
7. **Ended cohorts leave the risk model.** Risk and "active" only apply to courses that are running; ended courses report outcomes.
8. **A rate that can exceed 100% is a bug, not a clamp.** Compute from set intersections; the `Math.min(100, ...)` stays only as an assertion.
9. **Every stored number written by a cron has a reader, and every metric a funder could quote has a definition in `METRIC_DEFS`.** Orphaned tables and undefined labels fail review.
10. **Provenance travels with the row.** Attendance, video watches, and survey responses carry a `source` (embed / zoom_report / manual; button / player; auth / public) so a "verified" claim can be computed, not asserted.
