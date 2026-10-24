# Program participant backend

`getMvpProgramParticipants(params)` is a server-only, opt-in detail loader. Select one program; course, location, learner-status and offering-date filters follow the existing dashboard semantics. No UI or public endpoint is added. The default dashboard and exports do not read or return contact details.

## Access and units

Every call rechecks session, preview mode, MVP permission, student-management capability, program access and course grants. Contacts are read only for the selected eligible roster, after date/location/status filtering. Staff and test exclusions come from the existing roster loader. Activity is scoped by course slug and eligible learner IDs, not stale activity program IDs. All reads exhaust cursor pagination and reject partial results on errors.

Rows represent learner/course participations, not unique learners across courses or historical cohort membership. Each includes name, email, offering identifiers, the existing tri-state active status, caught-up progress and last recorded supported learner action. Cohort assignment is not inferred. Certificates are neither calculated nor issued.

## Caught up

The calculation unit is a fully satisfied held session: all explicitly mapped requirements due as of evaluation must be satisfied for that session to earn credit. Percentage = fully satisfied applicable sessions / applicable held sessions × 100. This is not an average of action-type scores or the furthest week visited. Repeated actions and future sessions do not inflate the count. Missing mappings, unresolved attendance or invalid evidence produce unavailable, never a fabricated zero. No applicable denominator is unavailable, not 100%.

`MVP_PARTICIPANT_PROGRESS_POLICIES` is deliberately empty. An exact program/course mapping must list all requirements for each held session, including explicit timezone-bearing due timestamps. No rules are inferred from content being enabled. Required work can be completed late for caught-up progress; the separate approved active-status grace-period calculation is unchanged. Attendance completion currently requires valid finalized review evidence; unreviewed check-ins alone do not certify this score.

## Last activity

Uses submitted_at from submissions/reflections and video_watched_at from week_progress. It preserves a UTC instant for frontend timezone formatting. Drafts do not count. Future/invalid timestamps make recency unavailable. No supported actions returns none_recorded, not a claim that the learner has never participated.

Attendance entry timestamps, staff finalization/correction timestamps, profile-wide activity and certificate dates are excluded because they cannot prove a learner action within this selected course. These coverage limitations are returned with the detail response.

## Delivery boundaries

Backend only: no database migrations, seeds, writes, new live rules, UI card, or changes outside MVP folders. Real requirement mappings are needed before caught-up percentages can be populated. All-accessible-program contact listings are intentionally not enabled by this detail loader.
