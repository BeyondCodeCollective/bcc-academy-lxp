# Production course comparison: Field Ready Staff Cohort

Observed November 25, 2026, approximately 12:34–12:35 AM Eastern, in the signed-in
bccacademy.io production dashboard. Read-only UI comparison; no database writes,
attendance decisions, code deployment, or exports.

## Scope and method
- Program: Field Ready; course: Field Ready Staff Cohort.
- Overview/Programs: all learner statuses, all locations, no date limits.
- Learners: same program/course, all learners, blank search, no cohort or chart filter.
- Visits were sequential, not an atomic database snapshot.
- Overview does not expose individual roster identities. Its course count was compared
  with Programs; Programs and Learners displayed the same four named people.
  Names/contact details are intentionally omitted here.
- The original browser tab had learnerStatus=started and showed zero for this course.
  Selecting filters did not visibly apply the new route during the initial attempt;
  direct navigation to the observed program/course scope produced the matched results.
  This is not a confirmed persistent filter defect.

## Results

| Measurement | Overview (course-filtered section) | Programs | Learners |
| --- | --- | --- | --- |
| Population | 4 participants | 4 participants; four named rows | 4 matching people; same displayed names |
| Recorded attendance | 100%; 4/4 meet 80% | 100%; 4 meet 80% | No equivalent raw percentage column |
| Verified attendance | Not displayed in course table | Not displayed in course table | Unavailable for all four |
| Course lifecycle | Active, Nov 9–Dec 7, 2026 | Same | Not the directory status measure |
| Learner starts | Unavailable | Unavailable | Not a corresponding column |
| Active learners / completion | Unavailable | Unavailable | All four statuses Not evaluated |
| Progress | Not shown in course table | Unavailable for all four | Unavailable; requirements not configured |
| Last activity | Not shown | Four timestamps present | Same per-person timestamps |
| Review flags | No verified flags; evaluation incomplete for one course | Needs-check-in cell unavailable | 0 supported flagged people |
| Sessions held | No corresponding course-table field | No corresponding table field | 1 |
| Attendance chart | Recorded threshold breakdown available | Not equivalent | Hidden to protect small groups |

Learners reports for all four: some required sessions have missing, unresolved,
or conflicting staff review evidence. Progress explanation: complete participant
requirements are not configured for this offering.

One learner evidence drawer was inspected as a sample: Week 1, Session 2 was
Unresolved, with an explicit statement that this is not a verified absence.
No supported flags were recorded; offering rules/evidence were not fully evaluated.
The other three drawers were not inspected.

All four current cohort fields were Unlinked. Course membership exists; an
individual cohort link is a separate field.

## Conclusions and limits
- No displayed roster/count mismatch was found for this course under matched filters.
- Recorded attendance and finalized attendance differ in availability. The live UI
  confirms the review-evidence limitation, not whether its underlying cause is absent
  review rows, invalid/conflicting rows, or an undeployed review table.
- Existing activity is visible and agrees across Programs/Learners for these four.
  This does not prove all historical activity records share correct program stamps.
- The all-program Learners attendance chart was unavailable; narrowing to this course
  changed it to privacy suppression. These are different states.
- Overview top KPI cards remained organization-wide (portfolio 10), so they were
  excluded from the course-population comparison.
- Zero supported flags does not mean every learner was evaluated.
- No live database ownership, migration, or review-history audit was performed.
  Those remain the next verification tasks.

This completes the live UI comparison subtask, not the entire production-data audit.
