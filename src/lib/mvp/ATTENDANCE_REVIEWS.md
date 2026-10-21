# Attendance review backend

This change depends on the two attendance migrations in the preceding PR:
`20261009010000_mvp_attendance_reviews.sql` and
`20261009020000_mvp_attendance_finalization.sql`.
No migrations are applied by this work.

## Scope

- Authorize every save and history read for an admin/super-admin, the selected
  program/course, and the learner's scoped enrollment. Instructor grants cannot
  expand review permissions. Existing authentication and preview restrictions
  are enforced by `requireManager`.
- Validate required sessions against the server-resolved schedule and require
  exactly one completed delivery record. Missing/conflicting evidence fails
  closed. Positive check-ins prevent confirming absence.
- Reject client-supplied reviewer identity, held time, recorded time, and new
  revision. The server supplies `heldAt` after delivery verification. Because
  session content has no exact delivery timestamp, this is verification time,
  not a claim about the historical session start time. The database supplies
  the audit timestamp and appends a revision.
- Pass the expected revision to the service-only transactional function.
  Stale corrections fail instead of overwriting history. A new reason is
  required; saving an unknown decision can retract earlier certainty.
- Load complete scoped review history, then evaluate the latest applicable
  revisions. Missing reviews do not establish absence. Historical eligibility
  remains a staff attestation with an evidence reference, not an inference
  from the current roster. Excused/ineligible sessions do not establish a
  full active-status denominator without an explicit policy.
- Expose save/history server actions with limited return fields. The internal
  bulk evidence loader requires an already authorized offering and roster;
  it is not itself a public endpoint.

## Deliberately excluded

No dashboard layout, reporting, active-rule configuration, or staff form is
changed here. Dashboard integration of the evidence loader/verifier belongs
to the subsequent queries/loaders PR. The verifier test exercises the pure
evidence function directly so this PR does not depend on that integration.

## Verification boundary

Tests use synthetic data and mocked database calls. They check input spoofing,
permissions, scope, delivery conflicts, revision failures, pagination errors,
correction history, and server-action responses. They do not establish that
the SQL migrations, RLS, grants, foreign keys, or concurrent transactions have
been validated in a running database. Those require separate database review.
