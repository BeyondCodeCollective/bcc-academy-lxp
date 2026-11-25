# Why MVP results differ across pages

Recorded November 25, 2026, on MVP-Batch-Update_01. Documentation only; no
application behavior, database records, permissions, or migrations changed.

Evidence comes from the source comparison in CROSS_PAGE_DATA_DIFFERENCES.md and
live UI observations in PRODUCTION_FIELD_READY_COMPARISON.md. Production database
access is unavailable. Code findings are not proof of affected production rows.
This record contains no learner names, contact details, IDs, individual timestamps,
or individual attendance decisions. Small-group results are not repeated here.

## Confirmed explanations

| Reason | What differs | Consequence and evidence limit |
| --- | --- | --- |
| Attendance definitions | Overview/Programs show recorded check-in attendance; Learners finalized attendance requires reviewed eligibility and outcomes. | A recorded percentage can coexist with unavailable verified attendance. The live comparison showed this pattern and a review-evidence warning. It does not identify the underlying missing or invalid review records. |
| Required configuration | Learners progress requires offering-specific participant requirements. | The live page explicitly reported unconfigured requirements. Publishing code does not populate course policies. Missing configuration must remain Not evaluated rather than imply failure or success. |
| Delivery validation | Learners requires a complete dated required-session schedule and consistent elapsed-session delivery statuses before using held slots. Recorded course performance uses completed delivery slots through a different path. | A recorded rate may be available while a stricter result is unavailable. This is confirmed code behavior; a production schedule defect has not been established. |
| Filter scope | Overview top cards request organization-wide data; the course table applies URL filters. Learners has separate filters and different status meanings. | An organization total is not comparable to a filtered course or directory total. Matching the course and clearing optional filters removed the population discrepancy in the observed comparison. |
| Review counts versus completeness | Summary counts retain supported flags while other results require complete evaluation. Counts can represent courses, programs, or unique people. | Zero supported flags does not mean everyone was evaluated or all targets were met. Live UI showed incomplete evaluation alongside no supported flags. |
| Privacy suppression | Learners attendance/milestone charts suppress small populations. | A hidden chart can be an intentional privacy outcome even when another view has a recorded result. The live course-scoped chart explicitly showed privacy suppression. |
| Unknown propagation | Some aggregates become unavailable if any included offering lacks required evidence. | One unresolved offering can affect a broader summary. This explains the code mechanism, not which production offering triggered each unavailable total. |

## Confirmed code discrepancies; production impact unverified

- **Session ownership:** Overview/Programs read session_content by course slug;
  Learners also filters by the resolved owning program. Shared/reused slugs or
  historical ownership differences could select different delivery rows.
- **Historical check-ins:** Overview/Programs match attendance by course and
  authorized roster IDs; Learners additionally requires the enrollment program.
  Older records stamped with another program could be omitted on Learners.
- **Historical activity:** Participant and Learners activity loaders differ in
  program filtering and timestamp validation. The sampled live latest-activity
  values agreed; this does not verify the complete historical record set.
- **Missing table versus empty history:** loadMvpAttendanceReviews returns an
  empty list for PGRST205 or 42P01. A missing/unexposed review table and a table
  with no matching records therefore cannot be distinguished from that result.
  Repository migration files exist and are labeled LOCAL DRAFT; neither their
  presence nor that label establishes production deployment status.

Source anchors: queries.ts; learner-summary.ts; sessions-remaining.ts;
course-performance.ts; learner-attendance.ts; participant-queries.ts;
learner-activity.ts; attendance-review-queries.ts; learner-check-ins.ts;
learner-attendance-aggregates.ts; learner-milestone-aggregates.ts;
src/app/dashboard/admin/mvp/page.tsx.

## Verification boundary and pending checks

The local connection uses the development project; the live website uses a
different production project. Development has no session-content or attendance
records, and its API did not expose mvp_attendance_reviews. Those observations
must not be presented as production findings.

Pending production verification by someone with database access:

- Confirm mvp_attendance_reviews and its finalization function are deployed.
- Count review records and applicable course-scoped records without exporting identities.
- Check canonical course ownership and historical program assignments.
- Verify required schedule dates and each elapsed session's delivery status.
- Determine whether review evidence is absent, incomplete, conflicting, or inaccessible.

## Correction order

1. Resolve canonical ownership and share authorized record-selection rules.
2. Align held-session validation across pages without weakening evidence checks.
3. Clearly distinguish recorded attendance, verified attendance, unsupported results,
   privacy suppression, and evaluation coverage.
4. Compare matched filters and counting units; validate against production after deployment.

The documentation task is complete. Production record verification and fixes remain
separate tasks; no unavailable result has been replaced with an assumed zero.
