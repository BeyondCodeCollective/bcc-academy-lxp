# Course Builder — Design Spec

**Date:** 2026-05-30  
**Status:** Approved  
**Author:** Fonz Morris + Claude

---

## Problem

Adding a new course (Salesforce Admin, Network+, AI Fundamentals, etc.) currently requires a developer to create a TypeScript config file, open a PR, and deploy. This is a bottleneck for scaling to 50+ courses. Fonz needs to do this himself without any code changes.

---

## Terminology

The codebase uses the words "program" and "track" internally. These are never surfaced to users in the builder UI. The user-facing word is **course** — which is what a new Salesforce Admin, AI Fundamentals, etc. actually is.

Internally, each course created through the builder is stored as a **program with one track** (both sharing the same slug). This mirrors how ATG, Forte, and similar single-subject programs already work.

---

## What We're Building

A "Create Course" flow for super-admins only (`canSwitchPrograms` role check). Three pieces:

1. **Course creation form** — a single-page form at `/dashboard/admin/programs/new`
2. **Programs list** — a lightweight list at `/dashboard/admin/programs`
3. **Runtime resolution** — `getProgram()` learns to serve DB-created courses

Curriculum (week titles, session topics, prompts) is configured separately through the existing admin track editor after the course is created — not in this form.

---

## User Flow

1. Super-admin clicks "Manage Courses" (visible only to `canSwitchPrograms` users) in the admin panel header
2. Lands on `/dashboard/admin/programs` — a list of all courses (hardcoded ones shown read-only, DB-created ones have an Edit link)
3. Clicks "New Course" → `/dashboard/admin/programs/new`
4. Fills in 4 fields, hits "Create Course"
5. Success state appears inline — the form fields are replaced with a green banner and a copyable join link. No page navigation.
6. To add curriculum: use the program switcher to switch to the new course, navigate to its track tab in `/dashboard/admin`, fill in weeks/sessions via the existing `TrackOverviewForm` editor

---

## Course Creation Form

**Route:** `/dashboard/admin/programs/new`  
**Access:** `canSwitchPrograms` only — redirect to `/dashboard/admin` otherwise

### Fields

| Field | Required | Notes |
|---|---|---|
| Course Name | Yes | e.g. "Salesforce Admin" |
| Instructor | Yes | Plain text name |
| Length (weeks) | Yes | Number input |
| Sessions per week | Yes | Number input |

**Slug:** Auto-derived from the course name client-side (`"Salesforce Admin"` → `salesforce-admin`). Shown as a live preview beneath the name field: `bccacademy.io/join/salesforce-admin`. Not editable — derived only.

**Join link format:** `/join/[slug]` (no `?track=` param needed since the course and its single track share the same slug).

**On submit:** Single Server Action that:
1. Derives slug from name; checks uniqueness against both hardcoded TS config slugs and the `programs` table. If taken, returns a form error: "A course with this name already exists."
2. Inserts into `programs` table (`slug`, `name`, `is_dynamic = true`)
3. Uses the new program's `id` to insert into `track_overrides` (`program_id`, `track_slug = slug`, `name`, `instructor`, `total_weeks`, `sessions_per_week`)
4. Returns success to the client — form is replaced with the join link banner. No redirect.

`require_invite_link` defaults to `true` for all DB-created courses — hardcoded in the `buildProgramFromDB()` function, no DB column needed for V1.

---

## DB Changes

### `programs` table — add 2 columns

```sql
ALTER TABLE programs ADD COLUMN name TEXT;
ALTER TABLE programs ADD COLUMN is_dynamic BOOLEAN NOT NULL DEFAULT false;
```

`description` and `require_invite_link` are V2 — no DB columns needed now. `require_invite_link` defaults to `true` and is hardcoded in the app layer for all dynamic courses.

### `track_overrides` table — no changes needed

Already has every field a lean track needs (`track_slug`, `name`, `instructor`, `total_weeks`, `sessions_per_week`, `program_id`). For dynamic courses, all fields are written non-null at creation time. The null-fallback merge logic in `mergeTrack()` still works correctly — it just never falls back since all values are populated.

---

## Runtime Resolution

`resolveBaseProgram()` in `src/lib/programs/server.ts` currently resolves to a TS config or throws. We extend it with one new code path:

```
if slug matches a TS config → return TS config (unchanged)
else → query programs table WHERE slug = ? AND is_dynamic = true
       if found → build ProgramConfig from DB (program row + track_overrides rows)
       else → throw / fall back to default
```

The DB-built `ProgramConfig` is structurally identical to a TS-config program — same shape, same fields — so every downstream consumer (`AdminTabs`, `getProgram()`, the join page, etc.) works without modification.

### `/join/[slug]` fallback

The join page currently reads from TS configs only. Add a DB fallback: if the slug doesn't match a hardcoded program, query `programs WHERE slug = ? AND is_dynamic = true` before returning 404.

---

## Programs List

**Route:** `/dashboard/admin/programs`  
**Access:** `canSwitchPrograms` only

A simple table showing all programs — hardcoded (read-only badge) and DB-created (Edit link). A "New Course" button in the top-right links to `/dashboard/admin/programs/new`.

This page is intentionally minimal for V1. No analytics, no student counts — just a directory.

---

## Curriculum (Post-Creation)

Not in scope for this builder. After a course is created:

- Super-admin switches to the new course via the program switcher
- Navigates to the course's track tab in `/dashboard/admin`
- Uses the existing `TrackOverviewForm` and `saveSessionContent` infrastructure to fill in week summaries, session titles, and prompts

This works because `track_overrides` is already the storage layer for curriculum overrides — DB-created courses just happen to have all their data in `track_overrides` from day one.

---

## What's Explicitly Out of Scope (V1)

- Multi-track courses (Forge-style) — create a single-track course; multi-track is a V2 concern
- Cohort management — no cohort created at course creation time; add cohorts later if needed
- Course editing after creation — edit link on the programs list is a placeholder for V2
- Deleting / archiving courses
- Course description field (can be added trivially once the DB column exists)

---

## Upgrade Path (V2)

The lean track form (name, instructor, weeks, sessions/week) maps directly to the full `track_overrides` schema. Adding more fields (start date, session times, description, short name) is a matter of adding inputs to the form — no schema changes needed since those columns already exist.

Multi-track support would introduce a dedicated creation flow (closer to the hub+spoke wizard we prototyped) once the single-course case is solid.
