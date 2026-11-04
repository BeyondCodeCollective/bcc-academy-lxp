# Learner record relationships

Code/schema audit, updated October 24, 2026. This describes repository contracts, not
verified production data coverage. The Learners view is currently an authorized
workspace shell: it does not query records or offer exports.

## Identifiers and joins

| Entity | Identifier | Relationship and limits |
| --- | --- | --- |
| Learner | `students.id` | Profile identity used as `student_id` in enrollment and activity records. Names and emails come from `students`, not activity payloads. |
| Program | `programs.id` (UUID) | `programs.slug` is the configuration/routing key, not interchangeable with the UUID. Resolve the authorized program before joining. A profile's `program_id` is not its complete enrollment history. |
| Course | `track_slug` (text) | Course identifier used by existing configuration and enrollment. Attendance calls this column `track`. Use an authorized `(program_id, track_slug)` offering; a slug alone does not grant access. No new course UUID is assumed. |
| Enrollment | `student_tracks.id` | Joins `student_id` to `students.id` and `program_id` to `programs.id`, with `track_slug`. The later `student_tracks_unique_per_track.sql` migration replaces the original three-column key with unique `(student_id, track_slug)`; current assignment code uses that two-column conflict target. Program is current attribution, not a separate enrollment attempt. `created_at` is record creation, not proof of a learner's first session. |
| Cohort | `cohorts.id` | `students.cohort_id` is a profile assignment. `cohorts.program_id` and `cohorts.track_slug` link cohort metadata to an offering. This is not a dated many-to-many learner membership history. |

```text
students.id <-- student_tracks.student_id
                   +-- program_id --> programs.id
                   +-- track_slug --> course configuration / overrides

students.cohort_id --> cohorts.id
                         +-- program_id --> programs.id
                         +-- track_slug --> course identifier (may be absent)
```

The cohort relationship is separate from enrollment. Do not multiply roster
rows by all cohorts linked to a course or assign all enrolled learners to them.
`cohort_track_scoped.sql` explicitly cleared stale profile cohort assignments;
its existence does not establish the current database's populated state.

## Activity joins

First resolve accessible offerings and their eligible enrollment roster. Then
join activity on learner identity AND course, using complete paginated reads.
Exclude staff/test accounts as the existing MVP roster loader does.

| Source | Learner/course join | Additional key/evidence |
| --- | --- | --- |
| `attendance` | `student_id`, `track` | Week + session; `checked_in_at` is a check-in record, not necessarily a learner action. Missing records do not establish absence. |
| `mvp_attendance_reviews` | `student_id`, `program_id`, `track_slug` | Week + session + revision; eligibility, outcome, held/recorded times. Use the existing verifier for authoritative attendance evidence. |
| `submissions` | `student_id`, `track_slug` | Week; `submitted_at` signals submitted work. Do not read private content merely to count activity. |
| `reflections` | `student_id`, `track_slug` | Week; `submitted_at` signals a recorded reflection, not its quality or an outcome. Do not expose responses. |
| `week_progress` | `user_id`, `track_slug` | Week; `user_id` references `auth.users.id` and is matched to the authorized learner ID by existing code. `video_watched_at` is a marked-watched action, also used in a live-session flow, not watch-duration telemetry. |
| `track_completions` | `student_id`, `program_id`, `track_slug` | Certificate ID and `completed_at`. Separate issued-certificate status from calculated progress/completion. Staff issuance and opt-in automatic issuance both exist. |

Legacy activity program stamps can be stale; follow the existing MVP's
authorized offering + roster + course scoping rather than trusting those stamps
to expand access. Activity is generally unique per learner/course/week (and
session for attendance), not per cohort or enrollment attempt. Repeated cohorts
cannot be separated reliably from these records alone. Upserted records are
not a complete action/event history.

## Derived values and safeguards

- Deduplicate people by learner ID across courses; deduplicate program
  participations by learner ID + program ID. Enrollment does not mean served.
- `participantLastActivity` uses selected-course submission/reflection/marked-
  watched timestamps. Label it recorded course activity, not last login.
- `MVP_PARTICIPANT_PROGRESS_POLICIES` is currently empty. A caught-up percentage
  needs complete mapped requirements and verified held-session evidence; do not
  substitute furthest week, certificate issuance, or missing-data zeroes.
- Keep missing cohort links absent. Do not infer cohort results from profile
  assignments or course dates.
- Future Learners loaders must enforce session/preview and program/course
  authorization before service-client reads, and paginate all sources.
- Geographic/survey aggregates and exports must use the shared privacy rules.
  Individual contact access is a separate authorization concern. Do not send raw
  contacts or hidden geographic counts to the globe or aggregate exports.
- The new view does not inherit Overview/Programs query filters. No Learners
  filters or exports are implemented by this initial unlock.

## Missing fields and unavailable evidence

These are limitations of the inspected schema and MVP loaders, not counts of
empty production fields. A nullable field is not proof that any actual row is
missing it. No database queries or migrations were executed for this audit.

| Area | Missing or insufficient evidence | Learners-page handling |
| --- | --- | --- |
| Names/email | Participant loader permits null names/email; identity matching across separate accounts is not provided by the learner ID. | Show unavailable values honestly. Never fabricate contacts or merge people by name/email alone. |
| Enrollment lifecycle | Current enrollment rows do not provide separate enrollment attempts, effective start/end membership intervals, or a retained withdrawal history. | Describe current enrollment only; do not turn `created_at` into first attendance or historic served counts. |
| Cohort membership | No historical learner-to-cohort membership interval is used by these loaders; profile assignment is singular and activity lacks cohort IDs. | Show linked metadata only; no inferred cohort-specific attendance/progress. |
| Progress requirements | `MVP_PARTICIPANT_PROGRESS_POLICIES` is empty; complete per-session requirements and verified held sessions are required. | Return unavailable progress with a reason rather than zero or a guessed percentage. |
| Attendance | A check-in alone does not provide the complete eligible/held-session denominator or establish absence. Reviews may be missing. | Use existing finalized evidence; preserve unknown outcomes. |
| Submissions/reflections | Timestamps establish recorded work, not graded success; current weekly rows do not retain every attempt. | Report recorded activity, not passing outcomes or a full submission timeline. |
| Video | `video_watched_at` does not provide watch duration, playback percentage, or a playback event history. | Label as marked watched/recorded activity, not measured viewing time. |
| Certificates | `track_completions` represents current issued records, not a retained issuance/revocation history or uniform eligibility rules. | Keep certificate status separate; no record is not proof of failed completion or certificate eligibility. |
| Geography | MVP reads self-reported `location`, `zip`, and `state`; `calculateMvpGeography` explicitly has no verified city/crosswalk. No validated region/coordinate mapping is supplied to the MVP. | Keep unknown/conflicting locations separate. Do not guess globe coordinates or historic residence. |
| Demographics | DOB may be missing/invalid; current age is not age at program start. | Preserve unknowns and label the evaluation date. Do not infer an enrollment age without a reliable start date. |

## Duplicate-record assessment

**Actual current duplicate counts: not measured.** The following identifies
documented prior issues, schema protections, and counting risks. It is not
authorization to delete or merge records. Constraints below describe repository
migrations; their deployment state was not inspected.

| Source | Protection / duplicate risk | Safe treatment |
| --- | --- | --- |
| `student_tracks` | Later unique `(student_id, track_slug)` prevents two enrollments for that pair. The migration documents ghost rows under old programs after course moves and removes older rows, keeping newest `created_at`, then ID. | This is a documented historical issue, not proof of remaining duplicates. Do not run that cleanup again as part of this audit. Scope by authorized program and course. |
| `students` | IDs distinguish accounts, not necessarily real-world people. Separate IDs may describe the same person; repeated names or shared emails alone are inconclusive. | Deduplicate known IDs only; flag possible identity matches for review, never automatically merge them. |
| `alumni_enrollments` | Unique `(source, email, track_slug)` permits the same person across sources/courses; there is no learner-ID link in this table. The key does not itself normalize email case/whitespace. | Keep imported alumni separate from current LXP unique-person totals until identity reconciliation exists. An enrollment import alone does not verify attendance/completion. |
| `attendance` | Unique `(student_id, track, week_number, session_number)`. Multiple sessions are legitimate records. | Count distinct session keys within scope, not arbitrary row joins. |
| `submissions` / `reflections` | Each is unique `(student_id, track_slug, week_number)`; upserts replace the same weekly record. | A submission and reflection in one week are different evidence types, not duplicates. |
| `week_progress` | Unique `(user_id, track_slug, week_number)`. | Count distinct weeks as recorded actions, not repeated viewing events. |
| `track_completions` | Unique `(student_id, track_slug, program_id)`; a learner may have multiple course certificates. | Count certificates by their intended unit; do not sum certificate rows as unique people. |
| `mvp_attendance_reviews` | Multiple rows per learner/session are intentional revisions, with unique revision values. | Use the verifier's revision/as-of rules; do not deduplicate away correction history. |
| Joined reports | One learner can have multiple courses, activities, or linked cohort metadata rows. Joining them directly can multiply rows. | Aggregate each evidence source at its own key first; deduplicate people by ID and program participation by learner + program. Do not join every course learner to every linked cohort. |

## Historical-data limitations

1. **Roster removal:** `removeStudentTrack` deletes the current enrollment. A
   later roster cannot reconstruct all previous learners or withdrawal dates.
2. **Program moves:** assignment upserts update the enrollment's program using
   the learner/course key. Prior program attribution is not a preserved
   participation history; legacy activity program stamps may also be stale.
3. **Cohort changes:** profile cohort assignment can change, and the cohort
   migration cleared stale assignments. No prior-membership reconstruction is
   justified by the current profile.
4. **Resubmissions and repeated actions:** submission/reflection/video actions
   upsert fresh timestamps into existing weekly rows. These are current stored
   timestamps, not guaranteed first-action dates or all past actions. Re-taking
   the same course cannot be reliably separated into attempts with these keys.
5. **Certificate revocation:** `revokeCompletion` deletes the completion row.
   This source alone cannot reconstruct revoked certificates or issuance history;
   do not treat the timestamp as independently verified academic completion.
6. **Profile changes:** current location and DOB-derived age cannot describe
   residence or age at every historical program start. Filtering old course
   dates does not create a historical profile snapshot.
7. **Imported alumni:** `enrolled_at` is nullable/best-effort and `imported_at`
   records import time. Alumni lack the canonical learner-ID link and verified
   session evidence required by current MVP metrics.
8. **Attendance is a partial exception:** review revisions can support as-of
   evidence evaluation through the verifier. This does not make enrollment,
   profile, submission, or certificate history complete.

## Recorded facts versus calculated metrics

A recorded fact means a value exists in a source record, not that it is
independently verified or historically complete. Staff decisions and
self-reports must retain their provenance. Calculations are not new source facts.

| Recorded evidence | Calculated or interpreted value | Required distinction |
| --- | --- | --- |
| Profile name, email, DOB, reported location/ZIP/state | Age bands, geographic groups, unique people | Profiles are current/self-reported. Group counts require deduplication and privacy processing; locations are not live GPS. |
| Current `student_tracks` row | Current enrolled count, upcoming enrollment count | Count only authorized eligible learners. Future enrollment requires schedule evidence; enrollment alone does not establish served/started. |
| Check-in row; staff-reviewed eligibility/outcome; session delivery evidence | Attended sessions, attendance percentage, missed-session flags | Staff review is a recorded decision. Percentages/flags require the verifier, an eligible held-session denominator, and the evaluation date. |
| Mapped first-session evidence | Started learner / people served count | Use verified start mappings, not account creation or enrollment timestamps. Deduplicate by learner ID. |
| Recorded submissions plus attendance and configured deadlines | Active learner status | Apply an exact offering policy. `MVP_OFFERING_ACTIVE_CONFIGS` is currently empty; approved default thresholds alone do not configure an offering. |
| Submission/reflection/marked-watched timestamps | Latest recorded course activity | Compute the latest valid selected-course timestamp. This is not last login, time spent, or live presence; absence of timestamps means no recorded activity, not proven inactivity. |
| Held sessions and mapped attendance/work requirements | Learner Progress / caught-up percentage | Count satisfied requirements against applicable held sessions. The progress policy registry is empty; no percentage should be invented. |
| Full required schedule and verified attendance | Attendance-based course completion / completion rate | This is a calculated definition, not whole-program graduation or certificate issuance. |
| `track_completions` row and certificate ID | Issued-certificate count / current issued status | The row is an issuance record. Its `completed_at` field is not independent proof of the attendance-based definition. Revoked records may no longer exist. |
| Survey answers and completion timestamps | Paired before/after averages, changes, response rates, income distributions | Answers are self-reports; comparisons require mapped questions and eligible matched respondents. A change does not establish program causation. |

For each future metric, document source, unit (people, learner/program pairs,
course enrollments, sessions), deduplication key, numerator/denominator, scope,
evaluation date, and unavailable/suppression reason. Keep known zero, missing
evidence, no recorded action, and withheld values separate. A calculated
learner-level percentage or flag remains sensitive even without raw answers.

## Sensitive fields and access

This is a technical inventory of current MVP enforcement plus a proposed
minimal-data contract for the Learners backend, not a new organization-wide
permission grant. Named staff members' roles were not inspected. Being on the
development/fundraising team or knowing a learner ID does not grant MVP access.

### Current MVP access boundary

| Actor/context | Current behavior in the inspected MVP code |
| --- | --- |
| Signed-out user | Page redirects to login; data loader rejects access. |
| Student or instructor base role | `canViewMvp` denies access. An instructor's admin-panel access does not grant MVP access. A cross-program grant does not bypass this initial base-role check. |
| Admin | May use MVP within authorized home-program and admin-level grant scope, narrowed to granted courses where applicable. Instructor-level grants do not expand MVP access. Invalid selected scope and failed access reads are rejected. |
| Super-admin | MVP loader permits cross-program access. Privacy processing and participant-detail selection requirements still apply. |
| Admin/super-admin in student preview | Data loader rejects access. The initial Learners shell only checks session/role and loads no records; it does not itself check preview mode. Any future Learners loader must include the preview exclusion before querying. |
| Participant-detail request | In addition to the above, requires `canManageStudents(role)`, an explicit program selection, and its filtered authorized roster. The internal participant helper is not an independently authorized entry point. |
| Funder, partner, or general staff | No dedicated MVP reader role exists. Do not infer permission from a job title, staff flag, or an aggregate being exportable. |

### Field-level handling for the Learners backend

| Fields | Sensitivity / permitted handling |
| --- | --- |
| Learner ID, name, email | Direct or linkable identifiers. Existing scoped participant detail can return these to authorized admins/super-admins. Keep them out of geography payloads, aggregate reports, URLs, and audit metadata. No learner contact export is provided by the current MVP report loader. |
| Program/course/cohort membership | Identifying education records when tied to a person. Return only within authorized offering scope; do not expose a learner's unrelated enrollments because one course is accessible. Cohort linkage alone never authorizes access. |
| Check-ins, attendance outcomes, eligibility, submission/reflection status, marked-watched timestamps | Individual participation records. Use only necessary summaries in authorized learner detail. Do not publish per-person evidence in aggregate downloads or the globe. |
| Progress, active status, missed-session/check-in flags, last recorded activity | Sensitive derived participation indicators. Same scoped access as their underlying records; do not treat calculated values as anonymous. |
| DOB and household income answers | Sensitive profile/survey data. Existing opt-in demographic loading reads these server-side; expose only necessary aggregates, not individual DOB or income in a learner list. Raw income loading currently reads survey response objects: project only required fields into any future client DTO. |
| Location text, ZIP, state | Potentially identifying, especially combined with program, age, or small groups. Current roster logic reads location for filtering; opt-in geographic loading also reads ZIP/state. Keep detailed fields server-side for the geographic view and return only privacy-processed aggregates. No exact-home markers or live tracking. |
| Submission descriptions, links/files, reflection answers, survey free text | Potentially highly sensitive private content. Existing MVP participant loader deliberately does not read submission/reflection content. Do not add it to the Learners page simply because the shared LXP stores it. Existing course-review tools have separate access paths. |
| Certificate ID/link, recipient name, issued date | Identifies a learner and credential. Existing public certificate pages are a separate disclosure path, not permission to expose learner contact/activity records. Avoid automatic public-link inclusion in aggregate exports. |
| Reviewer ID, eligibility basis, review revisions | Internal staff/evidence metadata. Keep out of ordinary learner summaries and aggregate exports; use existing authorized review workflows when needed. |
| Session credentials, service-role keys, calendar tokens | Never include in Learners payloads, exports, or audit documents. A broad profile select is not an acceptable substitute for an explicit field list. |

### Privacy and export coverage: existing versus proposed

- Existing shared protection covers geographic distributions and specified
  survey outcome/participation groups. It withholds nonzero small groups below
  five and related values; known zero is not suppression.
- `protectMvpGeography` and `protectMvpSurvey` are not a universal protection
  layer for every metric. Do not claim that age/household-income bands or future
  Learners breakdowns are already covered by those functions. Define and test
  their release rules before adding them to this page or its exports.
- Suppression does not authorize access to individual records and does not
  guarantee safety against repeated-query differencing. Keep counts, tooltips,
  derived rates, and alternative breakdowns from reconstructing hidden cells.
- Current MVP report loading requests no participant details. CSV/PDF creation
  rechecks authorization and calls `logAdminAccess` for a successful export with
  server actor, scope, format, section selection, and offering-row count. It does
  not log names, email, answers, or raw location text. Logging is best-effort,
  not confirmed durable delivery.
- No Learners endpoint or export exists yet. Its future DTO should separate
  aggregate/map data from individually authorized detail and allowlist fields
  for each purpose. Frontend hiding is not authorization.

### Shared-LXP access observations for Fonz (no changes made)

The application boundary above must not be confused with database-wide access:

1. `20260626120000_students_select_own_or_staff.sql` allows own-row reads and
   staff-role (`instructor`, `admin`, `super_admin`) profile reads. That policy
   has no program/course predicate or column-level restriction. It is broader
   than MVP scoping; this audit did not verify deployed policy state.
2. `track_completions.sql` contains a public SELECT policy with `using (true)`.
   Despite its "by ID" name, the policy itself does not enforce certificate-ID
   lookup. `rls_consolidate_permissive_policies.sql` explicitly retains it for
   shareable certificates. The application certificate loader does filter by
   ID; this does not narrow direct table policy access.
3. Server service clients bypass row-level policies. Every new MVP data entry
   point must authorize first; internal loaders rely on the caller to do so.

These shared policies are outside the MVP folders. Ask Fonz whether current
branches already address them and whether he wants us to make scoped changes;
do not alter them under this documentation task.

## Backend implementation decisions

- Start with authorized current-roster records. Keep alumni reconciliation and
  historical cohort reporting out of the initial loader.
- Treat unavailable evidence, no recorded activity, actual zero, and privacy
  suppression as distinct states.
- Add synthetic regression cases for repeated learner IDs across courses,
  multiple review revisions, missing contacts, missing cohorts, and overwritten
  activity timestamps. Keep source queries paginated and scoped before joining.
- Do not change shared schema or clean up records based on this audit. If
  historical membership/attempts or identity reconciliation are required, discuss
  those shared-LXP changes with Fonz first.

## Learners summary calculations

`getMvpLearnersData` returns `summary.totalEnrolled`, `sessionsHeld`,
`sessionsHeldUnavailableReason`, and a UTC `asOf` timestamp. These describe the
complete authorized, filtered roster before sorting or pagination, not the
visible page. Total Enrolled counts distinct learner IDs, never enrollment rows.
An empty matching roster returns zero for both counts without delivery reads.

Sessions Held counts required sessions once per matching program/course pair,
not once per learner. It uses the existing canonical course owner and override
precedence, plus `calculateMvpSessionsRemaining().delivered`: only explicitly
completed, already-arrived required sessions count. Future flags and labeled
extras do not count; matching duplicate delivery rows do not inflate counts.
Missing/conflicting delivery, incomplete schedules, or self-paced courses make
the entire Sessions Held total unavailable with a reason, never a partial total
or an invented zero. Verified upcoming/in-progress sessions contribute zero.

Search and current-cohort filters select learners and their matching offerings;
they do not establish historical cohort-specific schedules. Shared course
delivery is stored by course slug; counting the same delivered course under two
matching programs represents two offering opportunities, not two distinct live
meetings. This is not yet an individual attendance denominator or a Needs
Check-In calculation. The UI remains unwired.

Only schedule and delivery metadata are read, sequentially per distinct offering
with delivery cached by course slug and cursor-paginated until empty. Read errors,
duplicate schedule overrides, and stalled cursors fail the request. Synthetic
integration tests cover filtering, deduplication, pagination independence,
canonical ownership, known zero, unavailable evidence, and later-page failures;
they do not validate live database permissions or production data quality.

## Code references

### Learner directory progress integration

The authorized Learners loader now enriches each paginated enrollment with
`caughtUp` from the existing participant-progress calculation. It never combines
percentages across courses or substitutes aggregate video progress. Missing
policies return null values and the existing unconfigured-requirements reason,
without making extra activity queries. The policy registry remains empty.

Configured offerings reuse the authorized participant loader once per course on
the page, with its existing batched, complete reads and permission checks. Only
the selected learners' progress fields are returned. Missing, duplicate, or
out-of-scope progress records fail the request rather than inventing a result.
This reuse reads the configured course's roster internally; it is not a new
database-level page-only evidence query. UI wiring remains a separate task.
Tests use synthetic records, not live learner data.

### Course-specific verified attendance

Each returned enrollment now has `attendance: { present, eligibleHeld } | null`
and `attendanceUnavailableReason`. The loader shares the summary's resolved
schedule and delivery snapshot, then reads reviews and check-ins only for the
authorized directory page in batches of 100 IDs, paging until empty. No combined
cross-course attendance percentage is produced.

The denominator includes only required sessions verified as delivered by the
request's `asOf` time, using existing Eastern-time schedule rules. Future,
upcoming, and optional sessions are excluded. A known schedule with no held
required sessions returns 0/0 (not a percentage); unavailable schedules return
null. The existing `verifyMvpMissedSessions` verifier requires finalized historical
eligibility and outcome evidence for every included session. Current enrollment
or cohort membership alone does not establish historical eligibility.

Missing, unresolved, duplicate-latest, or conflicting reviews return null, never
guessed absences or zero attendance. The current shared verifier also withholds
the ratio for excused or explicitly ineligible sessions until a denominator
policy is configured; exclusion/credit rules remain a policy dependency, not an
implemented guess. Latest revisions apply only as of the request snapshot.

Reviews are program/course/learner-scoped. Check-ins have only learner/course
identity and are used to detect conflicting absence evidence, not infer activity
or historical program membership. Only the ratio, safe session states described
below, and a generic unavailable reason leave this layer: no staff identities,
eligibility basis, or review notes.
Read failures reject the request rather than returning partial attendance. The
frontend connection and detailed attendance-state display remain separate tasks.

### Distinct attendance session states

Each authorized enrollment returns `attendanceSessions`, sorted by week/session,
with only `weekNumber`, `sessionNumber`, and `state`. States are:

- `verified_present`: finalized eligible present review.
- `verified_absent`: finalized eligible absence with no conflicting check-in.
- `excused`: finalized eligible excused review; never counted as absence.
- `unrecorded`: no review or check-in available as of the request snapshot.
- `unresolved`: incomplete, invalid, or conflicting review evidence, including a
  check-in without a finalized review. This is not a verified absence.
- `not_eligible`: finalized ineligibility with unknown outcome.

Only verified held required sessions are listed. Unknown schedules return null;
known schedules without held sessions return an empty list. Latest valid review
revisions determine states; duplicate latest revisions stay unresolved. Private
review fields are not returned. These states remain available even when the
course ratio is unavailable; existing ratio and flag policies are unchanged.
Frontend state rendering remains a separate integration task.

### Evidence-backed Needs Check-In

The authorized loader now evaluates each matching enrollment using the existing
attention evaluator. Two verified required-session absences trigger the existing
`framework-missed-sessions-v1` rule (not a consecutive-absence rule). Excused,
unrecorded, unresolved, and ineligible sessions never count as verified absences.
Two proven absences may flag even if other sessions remain unresolved.

Mandatory-work flags require an exact program/course active configuration with
explicit assignments, deadlines, and elapsed grace periods. Marked-watched
checkpoint flags require an exact configured video policy. Existing shared
signal helpers are reused; no live configuration entries or deadlines are added.
Invalid or unmapped milestone evidence cannot establish missing work/progress.
Assessment rules remain unevaluated because assessment evidence is not connected
to this loader; no scores or cutoffs are inferred.

Enrollments return `status` and `checkIn` (flags, unevaluated rule IDs, evaluation
time, and a generic unavailable reason). Any supported flag produces
`needs_check_in`; absent flags do not imply `on_track` when offering requirements
or evidence are unknown. `on_track` means no flags under the configured evaluated
rules, not course completion. Unconfigured offerings remain `not_evaluated` unless
the approved absence rule has positive evidence. Session evidence references
identify verified program/course/learner/week/session tuples, not raw review IDs;
no private review fields or learner work are returned.

Status filters evaluate the full authorized search/course/cohort-matching roster
before deduplication-preserving pagination, retaining only matching enrollments.
Counts and summary cards use that filtered population. A learner can match
different statuses in different courses; those filter counts are not additive.
Unfiltered requests retain page-scoped evidence reads. Frontend wiring and the
Needs Check-In summary card are separate tasks.

### Weekly milestone timestamps

Each authorized enrollment returns `weeklyMilestones`, sorted by week, containing
`weekNumber`, `submission`, `reflection`, and `markedWatched`. Each milestone has
`at` (UTC ISO timestamp or null) and `state` (`recorded`, `none_recorded`, or
`unavailable`). The existing page-scoped activity reads now also select
`week_number`; no additional content reads are needed.

The timestamp is the latest recorded action for that learner/course/week/type,
not a full event history. Duplicate records collapse into the same milestone;
invalid, future, or timezone-free timestamps make that milestone unavailable
rather than silently falling back to an older timestamp. Other weeks and types
remain independent. Missing/invalid week mappings use `weekNumber: null`, placed
last, rather than guessing a week or dropping activity. Only weeks represented
in source records are returned; no records produce an empty list. Null or absent
marks mean none recorded, not overdue, required, or failed.

Video timestamps represent a marked-watched action, not verified viewing.
Private submissions, reflection answers, file links, staff edits, and login
timestamps are neither selected nor returned. Sources identify learner/course,
not historical program/cohort/attempt; shared-course enrollments may therefore
show the same milestones. Source failures still reject the whole request.
Frontend wiring remains separate.

### Last recorded course activity

The learner loader separately reads `submitted_at` from submissions/reflections
and `video_watched_at` from week progress for the selected page's authorized
learner/course pairs. Reads use batches of at most 100 IDs and cursor pages until
empty. Only identity, course, and timestamp columns are requested; no private
submission/reflection contents, login times, attendance entry times, or staff
edit timestamps are included. It reuses `participantLastActivity` and returns
UTC ISO timestamps with `recorded`, `none_recorded`, or `unavailable` state.
Invalid, future, and timezone-free timestamps are unavailable, not guessed.
Source errors fail the request rather than silently producing partial activity.
The existing directory renderer formats timestamps in America/New_York with a
timezone label; the backend is still not wired to the page.

Activity tables identify learner + course slug, not program/cohort/attempt.
The same learner/course action can therefore apply to matching enrollments in
more than one program; these values must not be labeled historical cohort or
program-specific activity. Overwritten timestamps cannot reconstruct history.

- `src/lib/mvp/queries.ts`: authorized offerings, current roster, attendance.
- `src/lib/mvp/participant-queries.ts`: scoped contact and activity reads.
- `src/lib/mvp/participant-progress.ts`: progress policies and activity dates.
- `src/lib/mvp/cohort-queries.ts`: linked cohort metadata only.
- `src/lib/mvp/attendance-review-queries.ts`: attendance review revisions.
- `supabase/migrations/student_tracks.sql`, `submissions_reflections.sql`,
  `week_progress.sql`, `attendance.sql`, `track_completions.sql`,
  `cohort_track_scoped.sql`: stored relationships and uniqueness.
- `supabase/migrations/student_tracks_unique_per_track.sql`: later enrollment
  uniqueness and documented ghost-row cleanup; supersedes the original key.
- `supabase/migrations/alumni_enrollments.sql`: imported enrollment scope and key.
- `src/app/dashboard/admin/actions-tracks.ts`: assignment upserts and removal.
- `src/lib/mvp/geography.ts`, `demographics.ts`: missing/conflicting geography
  and current-age semantics.
- `src/lib/roles.ts`, `src/lib/auth/program-access.ts`, and
  `src/lib/mvp/queries.ts`: MVP capability, scope, participant and preview checks.
- `src/lib/mvp/active-config.ts`, `privacy.ts`, `income-queries.ts`, and
  `report-queries.ts`: configured calculations, privacy coverage, sensitive
  source loading, and aggregate export selection.
- `src/app/api/mvp/export/route.ts`: export authorization path and audit call.
- `supabase/migrations/20260626120000_students_select_own_or_staff.sql`,
  `track_completions.sql`, `rls_consolidate_permissive_policies.sql`, and
  `src/lib/certificates/data.ts`: shared access-policy observations.
- `src/app/dashboard/track/actions.ts`: submission/reflection/video writes.
- `src/app/dashboard/admin/actions-misc.ts` and
  `src/lib/certificates/auto.ts`: certificate reads and issuance.
