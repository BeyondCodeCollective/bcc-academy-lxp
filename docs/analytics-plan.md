# Analytics Redesign Plan

> Living document. Goal: turn ~10 inconsistent analytics surfaces into **one
> coherent model** with **two clean layers** (Program → Course), trustworthy
> inputs, and metrics that fit both live and on-demand cohorts.

## The core problem

An audit of the admin analytics found, across 10 surfaces:

- **4 definitions of "engaged"**, **3 of "active"**, **2 competing risk models**.
- The two risk models (attendance-rate vs login-recency) can label the **same
  learner opposite** ways.
- **"Invited"** is measured from **two different tables** (`allowed_signup_emails`
  vs `invites`) → surfaces never reconcile.
- The worst-risk bucket has **three names**: "Disengaged" / "Inactive" / "Low attendance".
- Only the per-course view adapts to **live vs on-demand**; program funnels still
  hardcode "videos watched" as the lead signal (always 0 for live cohorts).
- `students.last_activity_at` is a **dead column**; the Insights page leaks
  **instructors + test accounts** into per-track totals.
- Several queries don't check `.error` → a failed query shows a **convincing 0**.

## Design principles

1. **One source of truth per concept.** "Engaged", "active", "at-risk", "invited"
   each have exactly one definition, in one module, consumed everywhere.
2. **Two layers, applied consistently.** Every surface offers *Program → Course*
   the same way. Program = roll-up; Course = drill-down.
3. **Modality-aware.** A track is `live` | `on-demand` | `hybrid`. Engagement is
   measured by the signal that fits: live → attendance/participation; on-demand →
   video progress. Same word, right signal.
4. **No silent zeros.** "Not recorded" must never render identically to "truly
   zero". Every analytics query checks `.error`.
5. **Exclude non-learners at the source.** Staff (`role != student`) and
   `is_test` are filtered in the canonical layer, not per-surface.

## Canonical definitions (proposed — decisions flagged ⚑)

### Signals (per learner, per track)
Attendance · Submissions · Reflections · Video-watched · Tutor messages ·
Browsing (`activity_events`). Each carries a timestamp. `last_activity_at` is
abandoned; `activity_events` is the browsing source of truth.

### Engaged (lifetime)
A learner is **engaged in a track** if they have ≥1 *primary* signal for that
track, where primary depends on modality:
- **live** → attended a session (or submitted/reflected).
- **on-demand** → watched a video (or submitted/reflected).
- **DECIDED:** tutor-chat / browsing are **activity, not engagement** (engagement
  = did-the-work signals only).

### Active (windowed, default 7d)
Any signal (including login + browsing) within the window. One definition for
every "Active (Nd)" number.

### Risk (one model, gated)
- **live tracks**: attendance-rate based, gated by `MIN_SESSIONS_FOR_RISK` (≥3
  recorded sessions) — already shipped in `compute.ts`.
- **on-demand tracks**: recency based (no scheduled sessions to miss).
- One label vocabulary everywhere. **DECIDED: On track / Check in / Inactive** —
  retire "Disengaged" and "Low attendance" as separate names.

### Invited
**DECIDED:** one table — `allowed_signup_emails` (already used by the Engagement
funnel); backfill direct-adds so it isn't an undercount.

## Phased work

### Phase 0 — shipped this session ✅
- [x] Engagement + Risk exclude staff (`role=student`) and `is_test` (#755)
- [x] Repaired corrupted Security+ attendance (unit-by-date remap)
- [x] Roster stale-state fix — "0 students / No students in scope" (#757)
- [x] Risk labels gated behind ≥3 sessions + softened wording (#758)
- [x] Zoom auto-attendance stamps session by schedule, not launch page (#757)
- [x] Zoom participant-report pipeline (awaits S2S OAuth creds) (#757)
- [x] Survey count drill-through; "Invited" excludes test email (#757)

### Phase 1 — Foundation (no visible change, high leverage)
- [x] Add **track modality** helper (`live` | `on-demand` | `hybrid`) —
      `src/lib/analytics/modality.ts` (derives from `selfPaced`; no migration).
- [x] Fix Insights (`insights-data.ts` / `dashboard/insights/page.tsx`) staff +
      `is_test` leak into active/per-track/phase totals.
- [ ] New `src/lib/analytics/engagement.ts`: canonical signals +
      `isEngaged` / `isActive`, modality-aware, staff/`is_test` excluded,
      `.error`-checked. Reuse `getLearnerActivity` (don't re-implement).
      Built alongside its first consumer in Phase 2 so it's validated in use.
- [x] ~~Retire dead `last_activity_at`~~ — **revised:** the column was revived
      (`auth/session.ts` now writes it; 32/122 populated and growing). Instead,
      stop treating a NULL as "inactive" — fall back to `last_seen_at`
      (`admin-tabs.tsx` active-count fixed). `activity_events` stays the
      browsing source for per-course.
- [ ] **Unify "invited"** — deferred to Phase 2 canonical layer. `invites` (288,
      105 used) and `allowed_signup_emails` (302) measure *different* things
      (invite-link acceptance vs. permitted-to-join), so it's not a swap. Canonical
      "reach" = allowlist; the invite-acceptance funnel keeps `invites` but gets
      relabeled so the two "Invited" numbers stop colliding.

### Phase 2 — Unify definitions (swap surfaces onto canonical)
- [x] Build `src/lib/analytics/engagement.ts` — `isEngaged` (attendance OR video
      OR submission OR reflection) + `isActiveWithin`. One definition.
- [x] Engagement funnel (A1) consumes it; reflections added to the union so it
      agrees with the Insights page (validated: Catalyst 12/15).
- [x] Insights (A3) consumes it: "Engaged ever" adds video (isEngaged);
      "Active 7d" adds login via isActiveWithin (Catalyst active 12→13).
- [x] **One risk model** across Attendance (A2) and Acquisition (A6): A6 now
      calls the same `summarizeStudent()` for learners enrolled in live tracks,
      scored only against *their* live tracks — which answers the old
      "rate-scoring mis-penalizes anyone not in every track" objection. Below
      `MIN_SESSIONS_FOR_RISK` it falls back to recency rather than reporting a
      false on-track. One label vocabulary already shipped (#758).
      No-op on today's numbers (Security+ has 1 counted session → recency);
      switches to attendance-based once 3+ sessions are recorded.
- [x] Per-learner /100 score (A10): the four did-the-work signals, each 25 pts.
      Video replaces the old tutor term (tutor = activity, not engagement), so
      self-paced tracks aren't structurally under-scored; UI shows "watched".
- [ ] Fix A6 funnel monotonicity (Active-7d can exceed Activated today) —
      carried into Phase 4 trust polish.

### Phase 3 — Two-layer scoping
- [x] **Course layer on the Engagement funnel (A1)**: `getEngagementAnalytics`
      takes an optional `trackSlug`; the dashboard renders course pills
      (All → per course) and re-fetches. Learners scope to `student_tracks` for
      the slug; "Invited" narrows to that track's allowlist.
- [ ] Course layer on Acquisition/Risk (A6): the same pill scope.
- [ ] Modality-aware columns: hide "Videos" for live tracks; lead with
      attendance for live, video-progress for on-demand.

### Phase 4 — Trust polish
- [ ] No-silent-zeros pass: render "—" for unrecorded vs 0 for true zero;
      "Never active" only under known data coverage.
- [ ] Completion (A5) works for non-certificate/live tracks (today reads 0%).
- [ ] Zoom participant-report API live once creds provisioned (captures
      app/phone/direct-link joiners the embed misses).

## Surface inventory (reference)

| Surface | File | Scope today | Target |
|---|---|---|---|
| A1 Engagement funnel | `actions-analytics.ts` | program only | + course layer |
| A2 Attendance | `attendance-tab.tsx` / `compute.ts` | per-course ✓ | canonical risk |
| A3 Operational Insights | `dashboard/insights/page.tsx` | program | canonical defs; fix staff leak |
| A4 Outcomes | `analytics/outcomes.ts` | program | + course filter |
| A5 Progress/Completion | `analytics/progress.ts` | per-track ✓ | non-cert completion |
| A6 Acquisition & Risk | `analytics/acquisition.ts` | program only | + course layer; one risk model |
| A7 Survey Insights | `analytics/insights-data.ts` | cohort filter ✓ | — |
| A8 Course engagement snapshot | `course-engagement.ts` | per-course ✓ | is_test filter |
| A9 Course roster stats | `course-engagement.ts` | per-course ✓ | is_test filter |
| A10 Per-learner score /100 | `page.tsx` | program | canonical; add video term |
