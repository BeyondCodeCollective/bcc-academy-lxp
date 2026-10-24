# Backend support for the planned pages

No report UI, database changes, or migration application is included. Server-generated PDF and CSV downloads are implemented. Opt-in separate-event support is described in GEOGRAPHY_EVENTS.md and detail/report extensions in DETAILS_REPORTS.md.

## Sessions remaining

`calculateMvpSessionsRemaining` returns required sessions not yet verified delivered, including overdue sessions. It needs a complete dated teaching schedule. Optional labeled extras are excluded. Future completed flags cannot reduce the count. Past sessions with missing or conflicting delivery states make the metric unavailable. Course rows expose `sessionsRemaining` and `sessionsRemainingReason`; learner filters do not change the course schedule.

## Demographics and locations

Existing age and income summaries remain opt-in. `includeLocations` independently enables a unique-learner profile-location summary, respecting program/course/date/status/location filters without requesting birth dates or income. Duplicate learners count once. Missing or conflicting profile locations are counted separately. `citiesRepresented` remains null because profile text is not an authoritative city field; `distinctReportedLocations` is explicitly different. No geocoding, new demographic categories, or learner-detail records are invented.

These internal aggregates are not a public-release privacy policy. Small-sample suppression and partner/funder sharing rules need approval before demographic exports are released.

## Report selection

`getMvpReportData(params, selection)` is a server-only entry point that reuses dashboard authorization, grants, preview exclusions and filter validation. Selection supports `metricKeys`, `demographics`, `locations`, `events`, and `outcomes`. The explicit numeric metric catalog supplies checklist labels and units; selection order is preserved and duplicates removed. Unknown properties/metrics are rejected before data reads.

Each offering retains its program/course context, dates, and status. Missing metrics retain null plus an unavailable reason; zero stays zero. No cross-course sum is called a unique-learner total. Optional sections that were not requested are absent. Separate-event tickets remain distinct from learner totals. There is no saved-report storage or draggable layout yet.

## PDF and CSV downloads

`POST /api/mvp/export` accepts JSON using the existing signed-in browser session:

```json
{
  "format": "pdf",
  "filters": { "programId": "the-selected-program-id", "startDate": "2026-09-01", "endDate": "2026-09-30" },
  "selection": { "metricKeys": ["started", "active", "sessionsRemaining"], "locations": true }
}
```

Use `csv` for the other format. Filters are optional and use the dashboard's keys: `programId`, `courseSlug`, `city` (reported profile location), `learnerStatus`, `startDate`, `endDate`. Null/empty values mean no selection. Unknown keys, arrays, invalid dates/statuses, unsupported selections and requests above 16 KiB are rejected. Demographic exports are explicitly rejected until privacy/small-sample rules are approved. Location summaries are internal profile-text aggregates, not verified city counts or an approved public-sharing dataset.

The handler calls `getMvpReportData` on every request, so role, preview mode, program grants and course access remain enforced. No client-supplied totals/rows are accepted. Responses use attachment headers and `private, no-store`; files are neither persisted nor uploaded. Permission/scope failures return 403, invalid inputs 400, non-JSON requests 415, and read/render failures 500 with a generic error (no partial download or database details).

CSV is UTF-8 with BOM, quoted cells, CRLF rows, and protection for formula-like text including whitespace-prefixed formulas. It is a long-form table with stable columns: section, program, offering, dates, status, metric, value, unit/denominator, reason. PDF uses the existing React PDF dependency and locally bundled fonts. Both include scope, applied filters, Last Refreshed, selected metric definitions, exclusion warnings and explicit Unavailable reasons. PDF limits (5,000 records; 1,800 characters per record) reject oversized layouts rather than silently clip content. Narrow the selection or use CSV in that case.

Tests cover serialization, selection validation, failure responses and real multi-page PDF generation with synthetic aggregates. A seven-page synthetic sample was rendered and visually checked using the PDF skill.

Local browser verification on October 8, 2026 used the existing dev super-admin session against the development database. Both authenticated requests returned 200 with attachment filenames, correct content types and `private, no-store` headers. The CSV (8,168 bytes) and PDF (25,820 bytes) downloaded successfully. CSV BOM and explicit Unavailable values were checked; all five downloaded PDF pages were rendered and visually checked for clipping. Anonymous export returned 403; an authenticated nonexistent program selection returned 403; demographic export returned 400. The temporary local verification page was removed afterward. No migration was applied and no production database was used.

Live tests with ordinary program-scoped admins and student/instructor sessions, plus deployed font tracing, remain unverified; automated authorization tests are not a substitute for those deployment checks. Export buttons/checklist wiring are intentionally left for the planned Reports UI.
