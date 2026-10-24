# Learner data audit

Reviewed October 19, 2026. Source-code inventory only; no database reads, writes,
record counts, or claims about production field completeness. A field defined in
a type, migration, or survey does not prove that learners have supplied values.

## Release boundaries

Overview and Programs are implemented views. Learners and Commitments remain
disabled navigation placeholders marked Coming later. Commitments replaces the
Reports placeholder; PDF exports remain on the existing pages. Development/funder
requirements are a separate future scope, not part of this rename.

## Inventory

| Data | Source in the repository | Current MVP connection | Limits / next design decision |
| --- | --- | --- | --- |
| Name and email | `students.id, first_name, last_name, email`; `participant-queries.ts` | Program participant activity, opt-in for a selected authorized program | Personal data; do not put contacts in aggregate exports. Not an organization-wide learner directory yet. |
| Program and course membership | `student_tracks.program_id, track_slug, student_id`; `queries.ts` | Current eligible roster, course-scoped filtering and metrics | Excludes non-students, staff and test accounts. Current membership is not a historical enrollment timeline. |
| Cohort | `students.cohort_id` in `src/lib/types.ts`; `cohorts` in `cohort-queries.ts` | Linked cohort information on course rows | The participant loader does not return each learner's cohort. Course-linked cohorts must not be treated as proof of an individual learner's cohort. |
| Reported location | `students.location`; `location-summary.ts` | Filter and aggregate distributions | Free text, not a verified city; spelling variants and missing values are possible. |
| ZIP and state | `students.zip, state`; `queries.ts`, `geography.ts` | Read for opt-in geographic summaries | Self-reported; no inferred city or ZIP-to-city mapping. Not an individual learner profile UI. |
| Current age | `students.date_of_birth`; `demographics.ts` | Current-roster age bands on Overview | Calculated as of evaluation date, not age at enrollment. Invalid/future/missing dates are unknown. Avoid displaying raw birth dates unnecessarily. |
| Household income | `survey_responses`, mapped by `household-income.ts` and loaded from `queries.ts` | Aggregate income bands on Overview | Latest completed mapped income instrument per learner; not salary. Only `bcc-learner-intake.household_income` and `mid-program-spring-2026.mid_household_income` are mapped. Missing newer answers stay missing. |
| Education | `students.education_level`; survey fields in `src/lib/surveys/schemas.ts` | Not connected to an MVP learner demographic summary | Profile and survey values need an explicit source-precedence rule and category mapping. |
| Gender, race/ethnicity, languages, first-generation college status, employment | Survey definitions in `src/lib/surveys/schemas.ts` | Not connected to unified MVP learner demographics | Some instruments use different fields/categories; race and ethnicity may be combined or separate, and some answers are multi-select. Do not merge blindly or assume population coverage. |
| Attendance/check-ins | `attendance`; `queries.ts`, `milestones.ts` | Attendance and course milestone calculations | Missing check-ins alone do not prove absence. Required/held-session mapping and roster scope matter. |
| Reviewed attendance | `mvp_attendance_reviews`; `attendance-review-queries.ts` | Finalized-evidence verification and check-in logic | Finalization, eligibility, revision consistency and access checks remain necessary. Source code does not establish migration deployment or populated reviews. |
| Submissions and reflections | `submissions` and `reflections`: learner, track, week, submitted timestamp; `participant-queries.ts` | Participant activity metadata | The participant loader does not retrieve work content. A submission timestamp does not establish acceptance or meeting a deadline. |
| Watched-video evidence | `week_progress.user_id, track_slug, week_number, video_watched_at` | Participant activity and configured video progress | Recorded watch evidence is not proof of comprehension or whole-course completion. |
| Learner Progress | `participant-progress.ts` | Calculation and display exist | `MVP_PARTICIPANT_PROGRESS_POLICIES` is empty. Without confirmed per-offering requirements, the percentage remains unavailable; do not substitute an arbitrary activity score. |
| Active status | `active-config.ts`, `course-performance.ts` | Tri-state evaluation and filters exist | `MVP_OFFERING_ACTIVE_CONFIGS` is empty. Unknown is not inactive. Active status and caught-up progress are different measures. |
| Last active | `participant-queries.ts`, `participant-progress.ts` | Latest recorded submission/reflection/video timestamp for the selected learner/course | Not last login or staff attendance edit. Profile `last_seen_at`/`last_activity_at` exist in the Student type but are not the course-scoped source here. |
| Assessment results | `exam_attempts`; `check-in-signal-queries.ts`, `learning-metrics.ts` | Configurable assessment calculations | An approved course/exam mapping and complete evidence are required. Not a general academic transcript. |
| Surveys/outcomes | `survey_responses`; `survey-queries.ts` | Mapped course/program aggregate outcomes | Preserve original scales, paired respondents, program access, and course scope; responses are not interchangeable learner profiles. |
| Certificates | `track_completions` used by `src/lib/certificates/data.ts` and `auto.ts` | Separate existing LXP functionality, not a learner certificate field in MVP participants | Do not infer issuance from attendance, progress, active status, or course completion. |

## What to build next for Learners

1. Define the page as an authorized current-learner directory plus learner detail,
   distinct from Programs' course-level participant activity.
2. Reuse enrollment/program/course access restrictions before reading contacts or
   demographics. Deduplicate directory people by learner ID while preserving
   separate course participation rows inside details.
3. Start with name/email, current program/course membership, reported location,
   and explicitly scoped activity. Add cohort only through the learner link.
4. Keep sensitive demographic answers out of the default directory. Choose
   permitted detail/aggregate views, small-group handling, and export policy
   before connecting more demographic categories. Existing demographic-export
   restrictions remain in place.
5. For new survey demographics, map exact instrument/field names, multi-select
   semantics, source precedence, and missing/prefer-not-to-say states. Do not
   substitute employment status or household income for employment outcomes.
6. Add search, sorting, pagination, inaccessible-record tests, empty/error states,
   and explicit unknown values. Do not label the page complete based on backend
   helpers alone.

## Separate future coverage verification

An approved read-only database audit can count eligible learners and missingness
per field/program, check orphaned membership/cohort links, survey instrument
coverage, duplicate responses, activity timestamp validity, and deployed review
tables. Report aggregates rather than raw personal responses. This audit did not
perform those checks, guess missing values, seed records, or apply migrations.

## Other code finding

`src/app/dashboard/admin/mvp/page.tsx` currently copies the active view's applied
filters into both Overview and Programs navigation URLs. That is inconsistent
with the requested page independence and should be fixed/tested separately. No
filter behavior was changed as part of this navigation-label/data-inventory task.
