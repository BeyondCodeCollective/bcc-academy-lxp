# PR 3: Dashboard queries and loaders

Prepared from `MVP-Cleaning_Duplicates_Files` on top of attendance-review
commit `726d51bc7`. No branch, commit, PR, database write, or migration execution
was created by this preparation.

## Included

- Authorized dashboard/detail loaders, scoped current rosters, course/cohort
  links, date and learner filters, and complete paginated source reads.
- Active-learner, required-work, assessment, video, attendance-review integration,
  staff-review, program/overview summary, and sessions-remaining calculations.
- Opt-in participant activity/contact reads, geography/location summaries,
  survey reads, separate event metrics, associated tests and backend notes.

Existing configuration registries stay empty; no real assignment deadlines,
progress policies, or results were invented.

## Excluded and preserved for PR 4

No page, navigation, layout, API export route, PDF/CSV renderer, report selection,
or page-download module is included. Report-specific tests in `queries.test.ts`
were omitted from this split; their original assertions remain on
`MVP-Cleaning_Duplicates_Files` for restoration alongside the report modules.
The mixed assessment/progress test retains its dashboard assertions here.
The attendance-verification integration assertion is restored now that this
PR includes the corresponding check-in integration.

## Local verification

- Full current-checkout suite: 587 tests passed in 53 files.
- TypeScript without incremental cache: passed.
- ESLint for `src/lib/mvp`: passed.
- US English and tracked diff whitespace checks: passed.
- Tests use mocked/in-memory database responses; no claim of live database,
  RLS, deployment, or production-data validation is made.

## Remaining review note

The saved `event-queries.ts` still uses per-event registration and attendee
reads. The earlier batched-fetch recommendation is not resolved by extracting
this code into PR 3; it remains a performance follow-up. Permission scoping and
pagination tests pass, but are not latency or production-load measurements.

## Branch/PR base

Create a new branch before committing these working-tree changes. If PR 2 is
not merged, target its attendance-review branch so PR 3 shows only this layer.
If PR 2 has merged, update the base to main and verify the diff. Do not push
these additions to the existing attendance-review PR by accident.
