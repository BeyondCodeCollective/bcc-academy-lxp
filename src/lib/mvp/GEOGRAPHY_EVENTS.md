# Geography, demographics, and separate events

## Authorized entry point

`getMvpDashboardData(params, options)` performs the existing admin/super-admin,
preview-mode, program and course permission checks. No new public route, database
write, migration, or UI is introduced. All new sources are opt-in.

- `includeLocations`: reads self-reported profile ZIP and state alongside existing
  location text. Returns `geography` aggregate distributions and existing `locations`.
- `includeDemographics`: retains current age and supported household-income survey
  distributions and adds the same geography summary. Household income is not salary.
- `includeEvents`: returns a separate `events` collection for authorized whole-program
  scope. Course-only admin grants and instructor grants cannot authorize event reads.

## Geography and demographics

Geography uses only the selected eligible current learner roster, after program,
course, date, location and learner-status selection. IDs are deduplicated across
courses. Conflicting or blank geography values count as missing. Leading-zero ZIPs
are preserved; labels are trimmed but are not geocoded or normalized into cities.
No verified city count or geographic crosswalk exists, so verified cities remain
unavailable. The response does not expose individual ZIPs or birth dates.

Existing demographic export restrictions remain unchanged. Small-cohort privacy
policy still needs to be established before adding public-facing demographic
views/exports. Event child demographics and guardian geography are not read or
combined with learner profiles.

## Separate events

Events are read from `events`, `event_registrations`, and `event_attendees`, with
stable-ID pagination through an empty page. Source failures throw; they do not
silently become zeros. No guardian contact details, ticket tokens, health records,
names, or birth dates are selected.

Drafts are excluded. Date selection uses interval overlap in each event's own
timezone and returns full-event evidence available now. Missing/invalid bounds
that prevent overlap evaluation are counted as excluded; no end date is invented.
Registration open/closed is not interpreted as event completion.

Confirmed registrations and confirmed/attended tickets provide enrolled ticket
counts. Active equals verified attended tickets (attended status plus a valid,
nonfuture check-in timestamp). Cancelled registrations/tickets are excluded;
waitlisted tickets are separate; seat offers and expired offers are not enrollments.
Inconsistent evidence makes enrollment/attendance totals unavailable rather than
returning partial totals. Missing check-ins do not establish absence.

Tickets are **participations, not unique people**. They never increase the LXP
learner KPIs and are not deduplicated by guardian email. Completion and check-in
flags remain unavailable without their own rules/evidence.

Current course, learner-location and learner-status filters describe LXP accounts,
not separate-event tickets. When applied, the event collection is explicitly
excluded with a reason rather than returning falsely filtered results. A future
event-specific view can add ticket-status and registration-geography controls.

## Verification

Local synthetic tests cover timezone overlap, unknown intervals, canceled tickets,
invalid check-ins, cross-program registration mismatches, duplicate ticket IDs,
pagination, opt-in reads, program/course grants, filter exclusions, source failures,
leading-zero ZIPs, conflicting profiles, and scoped aggregate geography. No live
event records were queried or modified. Database-backed event verification and
the future Programs/Events UI/report wiring are separate follow-up work.
