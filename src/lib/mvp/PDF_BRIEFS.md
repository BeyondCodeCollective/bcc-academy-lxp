# Page-specific PDF briefs

Overview and Programs use the same authenticated `/api/mvp/export` endpoint.
`view` selects the presentation, not permissions. The server reloads the allowed
program/course scope and recomputes results using all six applied filters.
Draft controls, another page's filters, and client-supplied totals are not used.

- Overview: current-roster summary, course-performance metrics, reported locations.
- Programs: current-roster summary, course-performance metrics, mapped survey outcomes.
- CSV keeps its existing selection and long-form layout.

The PDF is an aggregate brief, not a screenshot. In particular, Overview's pinned
organization KPI snapshot is not copied: PDF KPIs describe the applied export
scope at download time. The report records its filters and fresh retrieval time.

BCC blue and yellow-green accents follow the dashboard. Program and course labels
come from authorized filter options, not database identifiers. Unknown values stay
unavailable, zero stays zero, and course counts are never summed into unique people.
Survey ratings retain their source scale and paired sample size, not invented
percentages. Course completions are not certificates or program graduation.

Existing demographic export restrictions remain. Individual participant names,
emails, activity histories, staff evidence, and deferred commitments are excluded.
No database writes, migrations, external font requests, or file uploads occur.

The template flows onto extra A4 pages instead of truncating offerings. Course
identity accompanies each metric group across page breaks. A footer numbers pages.
Long-form definitions and unavailable reasons remain in the exported report.

Tests cover applied filters, independent view requests, authorized loading,
download/error handling, summary provenance, empty/unknown/zero states, and PDF
generation. `MVP_BRIEF_PDF` and `MVP_SAMPLE_PDF` can save synthetic compact and
long report fixtures from `report-export.test.ts` for visual inspection.
