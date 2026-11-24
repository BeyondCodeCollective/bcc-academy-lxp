# Connected Learners page checks — November 18, 2026

Branch: `MVP-Approved-Calculation-Policies`.
Checked code: `46d2f1935` (clean checkout before this report).
Route: `http://localhost:3000/dashboard/admin/mvp?view=learners`.

## Automated verification

- MVP suite: 74 test files, 914 tests passed (`pnpm exec vitest run src/lib/mvp src/app/dashboard/admin/mvp`).
- Project type checking: passed (`pnpm run typecheck`).
- MVP lint: passed (`pnpm exec eslint src/lib/mvp src/app/dashboard/admin/mvp`).
- Production build: passed (`pnpm run build`), including the dynamic MVP route.
- Repository-wide lint: failed with 200 errors and 74 warnings in the otherwise unchanged checkout. Examples include archived marketing link rules and test-file explicit-any rules. The command stopped before the US-English check. These are not a passing repository-wide lint result.

## Signed-in browser observations

The existing signed-in Chrome tab loaded the real local application, not a fixture.
It initially displayed the directory error state. Retry recovered to a successful
empty response; no persistent failure was reproduced. A temporary diagnostic that
logged only code locations was removed without retaining a functional code change.
The transient error's original cause was not established.

- Authorized program options loaded; selecting Black Girls Code narrowed course options.
- Selecting Roblox Virtual Bootcamp and Not evaluated, then Apply Filters, showed loading followed by a successful empty response.
- The selected course had no linked current cohorts; the cohort control stayed disabled.
- Search, email sorting, descending order, and page-size controls issued requests and completed with empty results.
- Clear filters restored the original all-programs/all-status selection and default pagination.
- Loading hid previous counts and results; empty results showed zero matching learners, empty charts, disabled selection/evidence controls, and disabled Previous/Next controls.
- A narrow browser viewport showed the stacked workspace without document-level horizontal overflow (actual measured CSS width: 487px). The viewport override was reset. Desktop document width also matched the viewport (1405px). This does not claim a 320px live-page check.
- No learner records were created or edited. No auth bypass, seeded production data, export, commit, push, or deployment was performed.

## Remaining acceptance checks

Both the all-programs and selected-course requests returned zero matching learners.
This verifies connected empty-state behavior, not correctness of a populated roster.
Do not mark fully connected acceptance complete until an authorized populated scope
is available for these checks:

- Compare actual roster membership and summary counts against known expected records.
- Verify search/status/sort and multi-page navigation with returned learners.
- Open real evidence, compare attendance and milestone timestamps, navigate selected learners, and confirm stale evidence clears.
- Exercise non-suppressed chart selections and suppression with real scoped results.
- Verify drawer keyboard/focus/mobile behavior on that connected page.

Prior synthetic/action integration and fixture-browser checks remain useful supporting
coverage, but do not substitute for the populated connected-page acceptance above.
