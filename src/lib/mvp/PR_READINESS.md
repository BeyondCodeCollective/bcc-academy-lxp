# MVP backend PR readiness — October 9, 2026

Status: ready for a scoped review PR
Branch checked: `building_MVP`

## Local checks
- Full repository unit tests: 561 passed in 53 files.
- TypeScript: passed (`tsc --noEmit --incremental false`).
- Targeted ESLint: passed for `src/lib/mvp`, the MVP page directory, MVP export
  route, admin top tabs, and `next.config.ts`.
- Repository US English guard: passed.
- Tracked diff whitespace check: passed.
- Full-repository ESLint: failed, with 333 errors and 79 warnings before the
  small MVP error-page fix. Output includes unrelated archive/source files.
  `.github/workflows/ci.yml` explicitly excludes full lint because of existing
  issues. This review did not repair unrelated source or duplicate files.
- Production build, preview deployment and live database tests were not run
  during this pass. Passing unit/type checks does not replace those checks.

Review fixes: the MVP error page uses Next Link for its internal navigation;
two test/documentation phrases were adjusted to pass the spelling guard; report
documentation was updated to describe the new optional event/outcome sections.

## Scope and authorization reviewed

- Admin/super-admin and student-preview restrictions precede dashboard reads.
- Rosters use both program ID and course slug. Attendance/submission activity
  retains authorized course-slug scoping rather than stale activity program IDs.
- Detail/evidence helpers reauthorize each read; identifiers cannot widen scope.
- Separate events require whole-program admin access. Tickets do not inflate
  unique learner counts; unsupported event filters/metrics disclose limitations.
- Report downloads reload authorized aggregates; no client-supplied totals or
  raw learner evidence are exported. Demographic export restrictions remain.
- Attendance writes validate scope and session evidence, derive actor identity,
  and use revision-checked append-only corrections. Database execution still
  needs verification after the migration review/application.

## Include in the review PR

Review the changed/new files in these paths, selecting only this task's work:

- `src/lib/mvp/` (implementation, tests and backend notes)
- `src/app/dashboard/admin/mvp/`
- `src/app/api/mvp/export/`
- `src/app/dashboard/admin/admin-top-tabs.tsx`
- `next.config.ts` (local PDF font tracing)
- supabase/migrations/20261009010000_mvp_attendance_reviews.sql`
- `supabase/migrations/20261009020000_mvp_attendance_finalization.sql`

The working tree also contains many unrelated untracked files with ` 2`in their names. They were preserved and must not be included through a blanket stage-all. No package/lockfile changes or package-store changes were present. `.env.local` and `dev-seed-admin.mjs` are ignored and untracked by Git; keep them out of the PR. No secret values were printed during this review.
