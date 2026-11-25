# MVP attendance field definitions

Reviewed November 25, 2026 on MVP-Batch-Update_01. Source-code audit only.
This describes current behavior, not approved future behavior or verified production data.
No calculation, database record, or UI label is changed by this document.

## Recorded attendance

Source: attendance rows, matched to learner/course and schedule session identifiers.
A record is evidence of a recorded check-in, not a finalized eligibility/outcome decision.
checked_in_at is the entry timestamp; it does not necessarily identify when a learner attended.
Duplicate check-ins for the same learner/session count once.

| Field | Current meaning | Display/use |
| --- | --- | --- |
| milestone.attendedRequiredSessions | Distinct check-ins matching required held sessions | Input to recorded attendance |
| milestone.heldRequiredSessions | Number of required held session slots supplied by the schedule | Recorded denominator; no per-learner review exclusions |
| milestone.attendanceRate | Recorded count / held slots × 100, rounded to one decimal | Internal learner milestone |
| program.attendanceRate | Sum of recorded attendance / sum of learner-session opportunities × 100 | Overview and Programs performance table: Attendance |
| program.attendanceQualified | Learners with recorded attendance at least 80% | Performance table: Meets 80% attendance |
| overviewParticipation.attendance.qualified | Sum of attendance-qualified learners across selected active course rows | Overview: ≥80% recorded attendance |
| overviewParticipation.attendance.total | Learner/course roster participations across those rows | Chart denominator; not distinct people across courses |
| overviewParticipation.attendance.percent | Qualified participations / total participations × 100 | Percentage meeting the threshold, not average attendance |
| overviewParticipation.attendance.notVerified | Total minus qualified when both are known | Currently labeled Not yet verified at 80%; this is NOT a review-status count |

Recorded attendance uses session_content completed statuses and schedule mapping.
Missing check-ins reduce recorded coverage but do not prove absence.
Missing schedule/denominator is unknown; a zero denominator does not yield 0%.
These calculations do not apply staff-reviewed excused/ineligible exclusions.

Sources: milestones.ts, course-performance.ts, overview-participation.ts;
UI: ../../../app/dashboard/admin/mvp/mvp-components/program-table.tsx and overview-participation.tsx.

## Verified attendance

Source: mvp_attendance_reviews, scoped by program, course, learner, week and session.
verifyMvpMissedSessions selects the latest valid revision as of the evaluation time.
It validates eligibility evidence, reviewer identity and timestamps, and checks conflicts
with check-in evidence. This is recorded staff verification, not an independent audit.

| Field | Meaning | Display/use |
| --- | --- | --- |
| finalizedAttendance.attended | Eligible held sessions with a valid reviewed present outcome | Numerator |
| finalizedAttendance.held | Required held slots minus reviewed excused/ineligible slots | Denominator |
| enrollment.attendance.present | Projection of finalizedAttendance.attended | Learners: Verified attendance |
| enrollment.attendance.eligibleHeld | Projection of finalizedAttendance.held | Displayed as present/eligible held sessions |
| enrollment.attendanceSessions | Per-session states below | Learner evidence drawer and attendance charts |
| attendanceUnavailableReason | Why evidence cannot establish the result | Learner directory/evidence explanation |

A finalized total requires all required held slots to be resolved and at least one
eligible slot remaining. Unresolved evidence returns null rather than zero.
The loader separately represents a known empty held schedule as 0/0, displayed as
No eligible held sessions. If every slot is excluded by review, the verifier returns
null with the reason that no eligible required sessions remain.

### Session states

| State | Meaning | Effect on finalized attendance |
| --- | --- | --- |
| verified_present | Valid review: eligible and present | Numerator +1; denominator +1 |
| verified_absent | Valid review: eligible and absent, without a conflicting check-in | Numerator +0; denominator +1 |
| excused | Valid review: eligible and excused | Excluded from both |
| not_eligible | Valid review: explicitly ineligible, outcome unknown | Excluded from both |
| unrecorded | No review history and no matching check-in | Unresolved; not a confirmed absence |
| unresolved | Missing, invalid or conflicting review evidence; includes check-in without review | Blocks a finalized total |

The attendance-by-session chart counts learners in each state. Its total includes
excused/ineligible learners: it is a population count, not an attendance-rate denominator.
Small-group privacy rules can suppress the chart.

Sources: attendance-verification.ts, learner-attendance.ts,
learner-attendance-aggregates.ts, learner-chart-selection.ts.

## Related fields that are not interchangeable with attendance

- started/startedLearnerIds: check-in evidence at mapped kickoff/first-session slots;
  not finalized attendance or proof of completing a course.
- completed/completionRate: currently attendance-based full-course calculation using
  raw check-ins and the full required schedule. It does not consume review exclusions.
- active/activeByLearner: separate offering-specific policy evaluation; not the same
  as meeting the recorded 80% threshold.
- check-in flags: verified absence evidence can establish the two-absence threshold
  even while other sessions are unresolved. Zero flags does not certify complete review.
- sessionsHeld: offering-level session delivery count, not learner attendance.
- lastActivity: submission/reflection/video timestamp; excludes attendance entry and
  staff-review timestamps.
- summary.verified (local KPI coverage change): partial known starts/completions/enrollments.
  The name does not mean those counts came from staff attendance reviews.

## Differences to resolve in later tasks

1. Rename or explain the chart's Not yet verified at 80% label; its computation is
   the complement of recorded qualification, not review coverage.
2. Label the performance table's Attendance and Meets 80% attendance as recorded measures.
3. Reconcile input scope: Overview/Programs check-ins use course + roster IDs;
   Learners additionally filters program_id. Delivery reads also differ by program scope.
4. Review the intended completion definition and exclusion handling before changing it.
5. Preserve separate recorded and finalized measures with explicit reasons and scope;
   do not relabel raw check-ins as verified attendance.
6. Confirm deployed review tables and evidence coverage separately. The shared loader
   treats missing-table/schema-cache errors as no available reviews.

Implementation references: queries.ts, learner-summary.ts, learner-attendance.ts,
attendance-review-queries.ts, completion.ts, active-config.ts, check-ins.ts,
learner-check-ins.ts, participant-progress.ts, verified-overview.ts.
