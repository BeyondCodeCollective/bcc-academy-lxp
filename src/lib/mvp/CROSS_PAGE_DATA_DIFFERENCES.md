# Cross-page matching, filtering, and calculation differences

Reviewed November 25, 2026 on MVP-Batch-Update_01. Source-code comparison only.
This does not establish which historical production records are affected.
No query, permission, policy, calculation or UI behavior is changed here.
See ATTENDANCE_FIELD_DEFINITIONS.md for attendance definitions.

## Implementation update: shared schedule loading

The schedule-loading task is implemented locally in schedule-loader.ts.
Overview and Programs (via queries.ts) and Learners (via learner-summary.ts)
now use createMvpScheduleLoader. The comparison below records the earlier audit;
its schedule-loader and delivery-selection discrepancies are superseded by this update.

- Schedule precedence is shared: known canonical owner override, selected-program
  fallback when the owner has no override, then existing legacy defaults.
- DB-only courses remain scoped to their selected program. No global ownership
  search or historical program reassignment is performed.
- Delivery reads use the resolved owner program AND course, with complete cursor
  pagination. A local override fallback also changes the delivery owner.
- Duplicate overrides fail closed, including when the server caps pages at one row.
- Delivery promises are cached per owner/course within one request only. Dashboard
  date filtering occurs before delivery is fetched.
- Existing caller authorization remains required; the shared helper is server-only
  and reads schedule metadata, never learner identities or activity.

This can make an Overview/Programs result unavailable when its only delivery rows
belong to a different program. That is intentional: those rows cannot establish
this owner's delivery without production ownership verification. No records are moved.

Loading and held-session validation are now shared. Recorded/verified attendance
definitions remain distinct. Historical check-in/activity matching,
production migration checks, missing policies, and UI labels are separate tasks.
Regression coverage compares both callers for owner fallback, foreign delivery,
conflicting delivery, and duplicate overrides, plus date-window read avoidance.

## Implementation update: shared held-session validation

held-sessions.ts now supplies resolveMvpHeldSessions to course-performance.ts,
learner-summary.ts, sessions-remaining.ts, and completion.ts. This supersedes the
held-session-validation discrepancy in the original calculation audit below.

- A complete dated required schedule is required. Existing Eastern calendar-date
  rules determine elapsed units; this does not infer an exact session end time.
- Only elapsed required slots consistently marked completed count as held.
- Upcoming and in_progress are known undelivered states, including on past dates.
- Missing, unsupported, or conflicting statuses for elapsed required slots make
  the entire held-session result unavailable. Recorded attendance must not retain
  a partial percentage while the same held-session context is unknown.
- Matching duplicate statuses count once. Future and labeled optional slots do
  not add held-session credit or invalidate elapsed-session evidence.
- A known empty held list is distinct from unavailable. With no held sessions,
  the held count can be zero while an attendance percentage has no denominator.
- Completion also uses this validation and still requires every required session
  to be held before applying the existing attendance-based completion threshold.

Staff review eligibility/exclusions and raw attendance remain separate measures.
No production data was changed. Production review-table availability, historical
program assignments, and missing offering policies still require verification.
Validation: 754 MVP tests and TypeScript passed, including cross-page scenarios
for missing/conflicting/duplicate delivery, incomplete schedules, future sessions,
known undelivered states, and Eastern date boundaries.

## Matching and data loading

| Area | Overview / Programs | Learners | Assessment |
| --- | --- | --- | --- |
| Enrollment | student_tracks by program_id + track_slug, joined to students; deduplicated learner IDs per offering | Same source and boundaries; deduplicates people and preserves distinct program/course enrollments | Broadly aligned; counts still depend on selected scope |
| Staff/test exclusions | Excludes tests; excludes staff/non-students except designated staff cohorts | Same exclusions, including per-row handling for mixed course batches | Aligned intent |
| Course inventory | Legacy config merged with program track_overrides; global hidden-course exclusions | Same source families and hidden-course convention | Overview inventory reads are not all paginated; Learners paginates programs/overrides. Potential scale issue, not demonstrated production truncation |
| Schedule metadata | Canonical course owner override, selected-program fallback, then legacy config values | Similar resolution, with explicit duplicate override detection and owner update on fallback | Duplicated implementations can drift |
| Session delivery | session_content filtered by course slug only | session_content filtered by resolved owner program_id + course slug | High-priority discrepancy: different input rows possible for shared/reused course slugs |
| Raw check-ins | attendance by course slug + authorized roster IDs; deliberately tolerates historical program stamps | attendance additionally requires enrollment program_id | High-priority discrepancy; establish correct historical ownership before choosing the shared rule |
| Staff reviews | Shared loadMvpAttendanceReviews, exact program/course/learner scope | Same loader, only after usable held-session context exists | Same source/verifier; upstream session and check-in differences remain |
| Participant activity | submissions/reflections/week_progress by course + roster IDs | Same tables plus exact program_id; validates scoped IDs and timestamp timezone | Possible last-activity/milestone differences for historical stamps or malformed timestamps |
| Course progress | Uses configured participant-progress calculator | Delegates to Programs participant loader when configured | Already shared calculation, but distinct from Learners milestone/attendance loading |

Sources: queries.ts; learner-roster.ts; learner-options.ts; learner-summary.ts;
learner-attendance.ts; attendance-review-queries.ts; participant-queries.ts;
learner-activity.ts; learner-progress.ts.

## Filtering and population

| Area | Difference | Interpretation |
| --- | --- | --- |
| Overview cards vs table | Cards request getMvpDashboardData({}); table requests applied URL filters | Intentional unfiltered snapshot, not automatically comparable with filtered rows |
| Page navigation | Overview/Programs preserve applied filters; Learners owns separate filter state | Selecting a scope on one page does not establish the same scope on Learners |
| Status filters | Overview/Programs: all, enrolled, started, active, completed, needs_check_in. Learners: all, not_evaluated, on_track, needs_check_in | Different definitions, not interchangeable statuses |
| Enrolled filter | selectMvpLearners maps enrolled to upcoming course lifecycle | Does not mean every current enrollment; wording/expectation requires review |
| Date filters | Overview/Programs select courses overlapping the date window; retain their scoped activity history. Learners has no equivalent reporting-date filter | Not an activity-date comparison |
| Location vs search | Overview/Programs can filter by exact trimmed profile location; Learners searches name/email | Different populations unless these filters are cleared or explicitly matched |
| Cohorts | Programs shows linked cohorts, keeping metrics course-level; Learners can filter through students.cohort_id validated against course/program options | Linked cohort display is not cohort-filtered measurement |
| Empty courses | Overview/Programs includes selected course rows even without enrollments; Learners derives session context from matching enrollments | Session/course totals may legitimately differ |
| Pagination | Learners computes flags/charts from the full matching population before directory pagination | Visible rows are not the summary denominator |
| Chart selection | Learners narrows directory and summary after creating charts from the base-filtered population | Chart totals intentionally remain the selection context |
| Counting units | Course participation totals vs unique learners vs distinct learner/program pairs | Same person may count multiple times in course totals, once in Learners summary |

Sources: page.tsx and overview-actions.ts under src/app/dashboard/admin/mvp;
date-window.ts; learner-filter.ts; learner-roster.ts; learner-queries.ts;
learner-chart-filter.ts; start-summary.ts; completion-summary.ts.

## Calculations and missing evidence

1. Recorded versus verified attendance is an intentional measure distinction.
   Overview/Programs recorded rates use check-ins and held sessions; Learners
   finalized ratios require staff-reviewed eligibility/outcomes. Labels should
   not imply they are identical. Review exclusions do not currently flow into
   the raw-check-in completion calculation.

2. Held-session validation differs. Learners uses calculateMvpSessionsRemaining
   to require a complete dated required schedule and consistent statuses for
   elapsed sessions before providing held slots. Course performance builds its
   recorded denominator from completed delivery slots. Duplicate delivery weeks
   invalidate its verification path, while its recorded rate uses another path.
   This can produce a recorded rate beside unavailable verified attendance.

3. Unconfigured rules differ. evaluateLearnerCheckIns explicitly appends
   offering-requirements-unconfigured when active configuration/requirements
   are absent. Overview's check-in evaluator evaluates the absence rule and
   configured additional rules without that same missing-configuration marker.
   No configured flags is not proof that all course expectations were evaluated.

4. Flag count units/completeness differ. Program row learnersNeedingCheckIn is
   null if any evaluation is not_evaluated. Staff-review summaries retain known
   flags and separately report incompleteness. Learners needsCheckIn counts
   distinct matching flagged people even when other people remain unevaluated.
   These totals must not be compared without units and coverage.

5. Additional signals are not symmetric. Overview can load configured assessment
   evidence and gates video progress signals to explicitly self-paced courses.
   Learners supplies exams: [] and has no equivalent self-paced gate in its
   evaluator; unsupported flag types can throw during evidence projection.
   The current signal registry is empty, so this is a latent discrepancy to
   address before enabling those policies, not a proven current production cause.

6. Aggregation can propagate unknowns. Strict organization totals withhold a
   full total if an included course is unknown. Learners session summary and
   charts have their own whole-result incompleteness rules. The local partial
   KPI coverage change does not resolve underlying matching or policy gaps.

7. Evaluation time is independently captured per request. Overview cards/table,
   page switches, and configured progress enrichment do not share one fixed
   evaluation instant. Boundary-date comparisons should use an explicit common
   instant in regression tests.

Sources: course-performance.ts; sessions-remaining.ts; attendance-verification.ts;
completion.ts; check-ins.ts; learner-check-ins.ts; staff-review.ts;
learner-queries.ts; learner-summary.ts; learner-attendance-aggregates.ts;
learner-milestone-aggregates.ts; check-in-signal-queries.ts.

## Prioritized follow-up

1. Compare one affected production course with identical program/course scope,
   no optional filters, and a common evaluation time. Record only safe aggregates.
2. Verify canonical delivery ownership and historical attendance/activity program
   stamps. Do not remove program boundaries or rewrite historical stamps blindly.
3. Reconcile shared matching and held-session resolution, preserving authorization.
4. Define comparable status/coverage semantics and clarify non-comparable filters.
5. Add regression cases for shared courses, conflicting delivery, mixed review
   coverage, missing configuration, exclusions and multi-enrollment counting.
6. Verify the resulting change after deployment. This document completes the
   identification step; it is not a deployed fix or a production data audit.
