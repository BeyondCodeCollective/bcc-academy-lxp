# Authorized detail, evidence and report coverage

## Program drill-down

`getMvpProgramDetail(params, options)` requires an explicit program ID and
reloads the normal authorized dashboard snapshot. It returns selected course
offerings, program aggregate coverage, attributed survey outcomes, definitions,
applied filters and refresh time. Geography, demographics and separate events
remain opt-in. It does not return a named learner directory or check-in IDs.
Course-limited grants remain course-limited. Missing cohort history is disclosed.

`getMvpCheckInEvidence(params, learnerId)` additionally requires a course slug.
It returns only that current learner's evaluation within the selected offering
and filters. Unknown, excluded or inaccessible learners cannot be retrieved by
guessing an ID. Supporting record references come from the existing evidence
calculators; this does not fetch raw submissions or bypass source-page permissions.
Every call checks session, preview mode and program/course scope again.

## Report sections

The existing PDF/CSV endpoint now accepts two optional boolean selection fields:

- `events`: include separate events using the selected metric checklist. Enrolled
  and active counts use attendee tickets, never unique LXP learners. Unsupported
  course metrics remain unavailable with a reason. Event registration status is
  not labeled as delivery status. Course/location/status filters that cannot be
  applied to events retain the explicit exclusion warning from the event loader.
- `outcomes`: include authorized survey measures with their original source,
  before/after/change, scale and paired respondent count. No raw answers or learner
  evidence are exported. An outcome-only selection is supported.

Both file formats use the same aggregate records and existing CSV escaping/PDF
limits. No arbitrary field names are accepted. No event totals are added to
learner totals. Privacy restrictions on demographic exports are unchanged;
structured ZIP/state export is not enabled by this change.

## Remaining boundaries

These are backend helpers, not new pages, buttons, draggable cards or an evidence
panel. Targets/commitments are still not populated. Historical people-served and
cohort limitations remain. No production/dev writes, migrations or pushes were
performed. Real-data checks and deployed download verification are separate from
the local synthetic authorization, serialization and PDF tests.
