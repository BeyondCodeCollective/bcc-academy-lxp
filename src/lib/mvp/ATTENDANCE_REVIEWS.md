# Local attendance-review backend draft

Migration: `supabase/migrations/20261009010000_mvp_attendance_reviews.sql`.
**Not applied by this work. No attendance UI was added. Authorized server actions are wired locally.**

## Local staff-finalization service

`attendance-review-server.ts` supplies `finalizeMvpAttendanceReview(input)` and `readMvpAttendanceReviewHistory(scope)`. The save is a final decision for one learner/session, not a batch course finalization. History reads take only programId, courseSlug, learnerId, weekNumber and sessionNumber. `attendance-actions.ts` delegates save/history operations to these authorized services, returns explicit DTOs and refreshes the MVP route after successful saves. Staff-facing controls remain deferred.

Each call reauthorizes admin/super-admin access (including the existing preview block), checks program and course-specific admin grants, resolves course membership, and checks the learner's program-scoped enrollment. Instructor grants cannot expand review permissions. Saves also resolve required sessions from the canonical schedule and require exactly one completed delivery record. Positive attendance blocks an absence decision. The held timestamp and historical eligibility reference are staff attestations; the service does not independently prove the contents of an external attendance sheet. Current enrollment alone never supplies historical eligibility.

The new follow-up draft `20261009020000_mvp_attendance_finalization.sql` must be reviewed/applied **after** the original migration. It adds correction links and reasons, plus a service-only transactional function. The function locks each target learner/session, compares expectedRevision (0 for a first decision), and appends a revision with the server-authenticated reviewer and database timestamp. Stale corrections fail without overwriting the previous review. Direct service-role inserts are revoked so saves cannot bypass the revision check. No update/delete path is added. Missing migrations and failed reads/writes fail closed.

Corrections require a new reason and the latest reviewed revision. Saving unknown can retract earlier certainty without deleting audit evidence. A positive check-in recorded after finalization must still be handled as a conflict by the verifier; finalization does not lock out future check-ins or delete them. Removed enrollments cannot currently be reviewed through this service; historical-roster authorization remains a separate policy decision.

Local tests cover validation, audit-field spoofing, role/program/course boundaries, scoped enrollment, delivery failures/conflicts, positive check-ins, stale-write responses, unavailable migrations and history pagination. They use mocks: actual SQL execution, concurrent transactions, grants and foreign keys still require dev verification by Fonz. Active/completion calculations are unchanged; reviewed evidence now feeds dashboard check-in calculations and the needs-check-in learner filter.

The existing attendance table records positive check-ins, not confirmed absence or historical eligibility. The new table stores append-only staff decisions for a program/course/learner/session, including evidence that the learner was expected to attend. No missing check-in is backfilled as an absence. `not_eligible` can represent a learner who had not joined yet or was no longer expected; it requires an evidence reference. `unknown` means unresolved, not absent.

Corrections insert a higher revision; they do not update or delete the previous decision. The verifier uses the latest revision available at its evaluation time. Excused sessions do not count as missed. Conflicts with positive attendance remain unknown until resolved. It accepts only required sessions independently verified as held. Two staff-confirmed absences trigger the existing two-missed-sessions rule (not a new consecutive-absence rule); fewer than two cannot clear the learner when other sessions are unknown.

`loadMvpAttendanceReviews` reads full revision history after dashboard authorization, scoped by program, course and authorized learner IDs. It batches learner IDs and paginates by ID until empty. Missing-table errors return no verified evidence (unknown check-in status, not inferred absence); other read errors fail the request rather than use partial history. The verifier applies latest corrections and checks conflicts with positive attendance. Ambiguous delivery rows leave check-in status unknown. Review details are not added to the dashboard response; existing flag evidence references review IDs. These reviews do not change active-status or completion calculations.

## Before activation

- Review and explicitly approve the migration; test SQL constraints and grants in a disposable database before deployment. Local TypeScript tests are not database validation.
- Verify the new server-only writer and transactional function in dev; historical eligibility remains an explicit staff attestation with an evidence reference. Do not expose service credentials or trust client-supplied reviewer identity.
- The complete scoped history reader is wired locally; verify it against dev after the migrations are deployed.
- Test RLS, append-only grants, correction history, actor references, and retention/deletion requirements. Foreign keys currently restrict deletion of referenced students/programs/reviewers; retention policy must be decided before applying.
- Add staff finalization UI separately; server-action wiring is implemented. Nothing here sends alerts or changes original attendance records.
