# MVP small-count suppression

The shared server loaders enforce a minimum nonzero group size of five before
returning data to dashboards, detail projections, or report consumers.
Known zero remains zero; withheld survey values are null, never zero.

- Survey groups with small paired/respondent counts or small unpaired remainders
  withhold all related measures, counts, averages, changes, and participation rates.
- Survey participation is withheld when respondents or a nonresponding remainder
  are below five, including the combined any-survey response rate.
- If any location, ZIP, state, or missing category is small, both geography
  projections are omitted in full, including totals and labels. This deliberately
  favors privacy over retaining a partially visible chart that permits subtraction.
- Location-filtered requests with a nonempty selected roster or offering below
  five are rejected with a privacy message; otherwise roster totals would disclose
  the hidden location count. This applies even when participant details are requested.
- Authorization, roster scoping, deduplication, and complete pagination run as before.
  Pure calculation functions remain internal and unsuppressed; consumers must use
  the protected loaders rather than publish raw calculations.

This is a small-cell release policy, not a guarantee against arbitrary repeated
query differencing or external knowledge. Additional disclosure controls would
require a separately agreed query/release policy. It does not replace participant
record permissions or the separate export audit-log requirement.

Bring this backend into #1243 before shipping. Its dashboard/PDF/CSV consumers
must preserve null/omitted values (never coerce them to zero), handle the privacy
message, and must not recompute hidden counts. Verify those outputs in #1243.

## Reports/UI integration (#1243)

The report projection carries the geography privacy warning into CSV and PDF.
Suppressed survey values stay null and render as unavailable, never zero.
A location-filter privacy rejection returns HTTP 422 from the export endpoint
with no attachment, and the dashboard shows a privacy notice with a clear-filters link.

Successful CSV/PDF generation calls the existing `logAdminAccess` helper with
action `export`, resource `api/mvp/export`, the server-authenticated actor,
authorized program scope, format, view, selected sections, and offering-row count.
No learner data or raw location text is copied into audit metadata. Failed or
denied requests are not recorded as successful exports. The shared helper is
best-effort/fire-and-forget and logs insert failures; this change does not claim
durable audit delivery or change that policy outside the MVP folders.

Automated tests cover audit invocation for both formats, denial/render failures,
privacy rejections, and suppression through the report loader, CSV records,
PDF document content, and rendered survey table. These use synthetic data;
they do not verify live database audit persistence.
