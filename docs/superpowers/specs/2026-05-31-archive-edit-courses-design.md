# Archive & Edit Courses — Design Spec

**Date:** 2026-05-31
**Status:** Approved

## Overview

Two new super-admin capabilities for builder-created courses (track_overrides rows under Catalyst):

1. **Archive / Unarchive** — close a course so students lose access; reversible
2. **Edit course settings** — change name, instructor, total weeks, sessions per week after creation

TS-config (hardcoded) tracks are read-only and excluded from both features.

---

## Data Layer

One new nullable column on `track_overrides`:

```sql
ALTER TABLE track_overrides ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
```

- `archived_at IS NULL` → active course
- `archived_at IS NOT NULL` → archived course
- Fully reversible: unarchive sets it back to `NULL`
- No separate table, no cascade deletes — all enrollment and progress data is preserved

---

## Server Actions

Three new actions added to `src/app/dashboard/admin/programs/actions.ts`:

### `archiveCourseAction(trackSlug: string)`
- Verifies super-admin role
- Confirms the slug exists in `track_overrides` (builder-created only — rejects TS-config tracks)
- Sets `archived_at = now()` on the matching row

### `unarchiveCourseAction(trackSlug: string)`
- Verifies super-admin role
- Sets `archived_at = null` on the matching row

### `updateCourseAction(trackSlug, { name, instructor, totalWeeks, sessionsPerWeek })`
- Verifies super-admin role
- Confirms the slug exists in `track_overrides` (builder-created only)
- Validates inputs (same rules as create: weeks 1–52, sessions 1–7, name non-empty)
- Updates the `track_overrides` row
- Reducing `total_weeks` hides curriculum weeks beyond the new count — content is preserved in DB, not deleted; reversible by increasing the count again

---

## Pages & Components

### `courses-list.tsx`
- `CourseRow` type gains `archived: boolean` and `isEditable: boolean` (false for TS-config tracks)
- Each active row gains an **Archive** button (text link style, right side)
  - Clicking shows an inline confirmation: "Archive this course? Students will lose access immediately." with Confirm / Cancel
  - On confirm, calls `archiveCourseAction` and refreshes
- Archived courses are separated into a collapsible **"Archived"** section at the bottom of the list with muted styling
  - Each archived row shows an **Unarchive** button instead
- Edit link (`⚙ Edit`) appears on builder-created rows only, navigating to `/dashboard/admin/programs/[slug]/edit`

### `programs/page.tsx`
- Supabase query for `track_overrides` adds `archived_at` to the select
- Splits results into `activeCourses` and `archivedCourses` before rendering
- Passes both arrays to `CoursesList`

### `programs/[slug]/edit/page.tsx` (new)
- Server component, super-admin gated
- Fetches current `track_overrides` row by slug; 404 if not found or is a TS-config track
- Renders `EditCourseForm` with current values pre-populated

### `programs/[slug]/edit/edit-course-form.tsx` (new)
- Client component, mirrors `CreateCourseForm` structure
- Fields: name, instructor, total weeks, sessions per week
- On submit calls `updateCourseAction`
- Success state: "Changes saved" confirmation with a link back to courses list

---

## Student Access Gate

In `src/app/dashboard/track/[slug]/page.tsx`:

- When loading a track, check if there is an `archived_at` value in the corresponding `track_overrides` row
- If archived: render a "This course has ended" message instead of the curriculum — no silent redirect, students get a clear explanation
- TS-config tracks (no `track_overrides` row) are never archived, so they always render normally

---

## What's Not Changing

- Enrolled students are **not** unenrolled on archive — `student_tracks` rows are preserved
- Curriculum content (sessions, progress data) is **not** deleted on archive or week-count reduction
- The join link continues to exist but new enrollments via an archived track are implicitly blocked (the track page shows "course ended" so the join flow would need a guard too — out of scope for this spec)

---

## Testing Checklist

- [ ] Archive a builder-created course → student session shows "course ended"
- [ ] Unarchive → student regains access
- [ ] Edit weeks (reduce) → weeks beyond count hidden from curriculum, content intact in DB
- [ ] Edit weeks (increase back) → hidden weeks reappear
- [ ] Archive/edit buttons absent on TS-config tracks
- [ ] Non-super-admin cannot call any of the three actions
