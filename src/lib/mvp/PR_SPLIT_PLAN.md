# MVP review split — October 19, 2026

## Local cleanup

Recovery point: `ebd78b6fc` on `building_MVP`, before this cleanup.
All 163 tracked filenames ending in ` 2` or ` 3` before their extension were
compared before removal: 153 were byte-identical to their original, six were
older versions of updated originals, and four matched historical versions of
files subsequently removed. No unique implementation needed to be merged.
All 13 duplicate migration files were byte-identical. Original files remain.
Git history retains all removed copies. No migrations were executed.

The cleaned comparison against the existing PR merge base
`d775c445a61aa017382e6e76d69a49aaa5e07105` has 99 implementation/documentation
files (before this plan). A direct comparison against the tip of main also
shows changes made on main since this branch diverged; do not transfer those
apparent reversions into new branches.

## Proposed dependent review groups

Create the first branch from freshly fetched main. Base each later PR on the
previous branch, or wait for the preceding PR to merge and then base it on main.
Do not open four independent PRs containing overlapping copies of the same work.

1. **Attendance schema (2 files).**
   `20261009010000_mvp_attendance_reviews.sql` and
   `20261009020000_mvp_attendance_finalization.sql` under `supabase/migrations`.
   Includes append-only reviews, permissions, correction links, and transactional
   revision checks. Review/apply in that order. Local unit tests do not validate
   SQL execution; this step does not apply migrations.

2. **Attendance review service and evidence.**
   MVP `attendance-finalization`, `attendance-review-server`,
   `attendance-review-queries`, `attendance-verification`, their tests,
   `ATTENDANCE_REVIEWS.md`, and MVP `attendance-actions` plus its test.
   Client input cannot supply held time. The service verifies delivery first,
   then stamps verification time on the server; the database stamps audit time.
   Keep dashboard integration in group 3. The verification test currently imports
   `check-ins.ts`; move its integration assertions to group 3 or split the test
   rather than pulling the entire dashboard dependency chain into this PR.

3. **Dashboard queries, metrics, and scoped participant loaders.**
   Remaining MVP backend changes, shared types, configuration registries,
   active/completion/check-in calculations, course/cohort/event/participant
   queries, summaries, and associated tests/docs. Exclude report/export modules
   and page components. Include the updated check-in integration here.
   Validate every new import against groups 1–3 before publishing.

4. **Reports and dashboard UI.**
   MVP page/components, workspace separator, overview refresh actions, participant
   activity UI, PDF/CSV report modules, `page-export`, export API and tests.
   Include `next.config.ts` font tracing and the small `admin-top-tabs.tsx`
   navigation integration explicitly; these are real changes outside MVP paths,
   not duplicates to delete. Include UI/report tests and relevant documentation.

## Publishing safeguards

- Preserve `building_MVP` and its existing PR while preparing the replacement
  stack. No force push, history rewrite, or automatic PR closure is needed.
- Commit duplicate cleanup separately from the held-time fix for clear review.
- Test each staged branch independently, including TypeScript, relevant unit
  tests, spelling, and diff whitespace. Reconcile conflicts with current main;
  do not overwrite newer work from Fonz's branches.
- Compare the final stacked result with the cleaned MVP changes so nothing is
  lost or duplicated. Include dependency/base notes in each PR description.
- This document is a split plan, not confirmation that replacement branches or
  PRs have been created, pushed, or reviewed.
