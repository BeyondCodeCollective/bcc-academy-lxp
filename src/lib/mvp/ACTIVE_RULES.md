# MVP active learner rules

Policies live in `MVP_OFFERING_ACTIVE_CONFIGS` in `active-config.ts`, keyed by exact program and course slugs. Changes use the normal reviewed-code workflow; this is not an admin settings screen.

- Cohorts: select the approved attendance threshold (default 80), grace period (default 14 days), and required weekly assignments with explicit UTC deadlines.
- Single events: select `kind: "single_event"`. Recorded attendance at a verified held required session qualifies; submissions do not apply. This adapter supports course-backed events, not separate external event systems.
- `requiredAssignments: []` explicitly confirms attendance-only eligibility. `null` means requirements are unconfirmed and status remains unavailable.
- Each assignment maps to one unique week because the current submissions source identifies work by learner, course, and week. Do not invent mappings or deadlines.

Grace is inclusive: due September 1 at 12:00 UTC means accepted through September 15 at 12:00 UTC with 14-day grace. Future assignments do not apply yet. Missing work within grace is pending (unknown), not inactive. After grace, missing or late required work fails the work criterion. Drafts do not count. Invalid/future timestamps or unavailable evidence remain unknown.

Attendance uses required sessions held so far. Missing attendance is not definitive absence; active totals stay unavailable if any learner cannot be evaluated. Filters choose overlapping offerings but do not truncate their submission or attendance evidence to the selected dates.

The live registry is intentionally empty until offering types and required assignment deadlines are confirmed. Defaults alone do not activate a policy. Submission reads use the authorized roster and course slug, not potentially stale activity program IDs. Database errors fail the load rather than producing misleading zero totals.

## Status filtering and activity scope

The status filter selects verified learner matches within each offering and recalculates participation, attendance, completion, surveys, check-in evidence, and requested demographics for those learners. Unknown memberships are excluded with a visible participation-count warning; they are not classified as inactive. An empty filtered roster means no verified matches, not necessarily no qualifying learners. All-status views retain unknown learners. Milestones overlap rather than forming exclusive labels.

Enrolled before start uses current enrollment in a future offering, not reconstructed enrollment history. Completed uses the existing verified attendance-based course completion calculation, not program graduation. Needs a check-in requires a verified flag; missing attendance alone cannot produce one.

Roster queries retain both program ID and course slug. Course membership is checked with `resolveScopeTrackSlugs` before attendance and session-delivery reads; these activity queries use course slugs rather than stale program stamps. Attendance additionally uses eligible roster IDs. Shared course slugs identify shared course activity, not independently addressable cohorts. Distinct cohorts need distinct identifiers before their activity can be separated.
