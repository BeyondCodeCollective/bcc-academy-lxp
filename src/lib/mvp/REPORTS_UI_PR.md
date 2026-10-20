# PR 4: Reports and UI

Base this PR on `MVP-Dashboard_queries_loader` while PR 3 is unmerged.
Create the PR 4 branch from that branch and carry these uncommitted changes
onto it before committing. Do not commit these changes to PR 3.

## Scope

- Existing Overview and Programs layouts, filters, resizable workspace,
  participant activity, staff-review cards, and survey outcomes.
- Overview refresh action and aggregate snapshot display.
- PDF mini-reports, CSV export, report selection and authorized report loader.
- Export API input validation and private/no-store responses.
- UI, export, and report-query regression tests.

Only MVP directories are changed. Attendance migrations, attendance-review
implementation, and dashboard backend implementation remain in earlier PRs.
The backend query test file gains the report assertions deferred from PR 3.

## Boundaries

- Shared admin navigation outside MVP folders is intentionally unchanged.
  The MVP remains accessible through its direct URL; coordinate shared
  navigation visibility with Fonz separately.
- Learners and Commitments remain coming-later placeholders.
- This restores the existing design; it is not a new data/configuration rollout.
- Database migrations are not applied by this change.

## Checks

Run the full unit suite, TypeScript without incremental output, ESLint for
the three MVP directories, the US-English check, and `git diff --check`.
Browser interaction and PDF visual verification are separate from these
automated checks; do not treat the unit suite as proof of production data.
