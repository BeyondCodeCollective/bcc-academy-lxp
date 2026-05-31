# Archive & Edit Courses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let super-admins archive/unarchive builder-created courses and edit their settings (name, instructor, total weeks, sessions per week).

**Architecture:** A new `archived_at` column on `track_overrides` drives the archive state. Three new server actions (archive, unarchive, update) gate on super-admin. The courses list gets inline archive/unarchive buttons and edit links; a new `/dashboard/admin/programs/[slug]/edit` page holds the edit form. The track page and join action both check `archived_at` to cut off student access and new enrollments.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase Postgres, Tailwind CSS, TypeScript.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/track_overrides_archived_at.sql` | **Create** | Add `archived_at TIMESTAMPTZ` column |
| `src/app/dashboard/admin/programs/actions.ts` | **Modify** | Add `archiveCourseAction`, `unarchiveCourseAction`, `updateCourseAction` |
| `src/app/dashboard/admin/programs/courses-list.tsx` | **Modify** | Archive/unarchive/edit UI + archived section |
| `src/app/dashboard/admin/programs/page.tsx` | **Modify** | Fetch `archived_at`, split active vs archived |
| `src/app/dashboard/admin/programs/[slug]/edit/page.tsx` | **Create** | Edit page server component |
| `src/app/dashboard/admin/programs/[slug]/edit/edit-course-form.tsx` | **Create** | Pre-populated edit form client component |
| `src/app/dashboard/track/[slug]/page.tsx` | **Modify** | Show "course ended" for archived tracks |
| `src/app/join/[slug]/actions.ts` | **Modify** | Block joins for archived tracks |

---

## Task 1: DB Migration — Add `archived_at` to `track_overrides`

**Files:**
- Create: `supabase/migrations/track_overrides_archived_at.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Adds archived_at to track_overrides to support archiving builder-created courses.
-- NULL = active. Non-null = archived: students lose access, join links blocked.
-- Reversible: unarchive sets archived_at back to NULL.
alter table track_overrides
  add column if not exists archived_at timestamptz default null;
```

- [ ] **Step 2: Apply it to the live Supabase project**

Run in the Supabase SQL editor (or via MCP):
```sql
alter table track_overrides
  add column if not exists archived_at timestamptz default null;
```

Verify the column exists:
```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'track_overrides' and column_name = 'archived_at';
```

Expected: one row — `archived_at | timestamp with time zone | YES`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/track_overrides_archived_at.sql
git commit -m "feat: add archived_at column to track_overrides"
```

---

## Task 2: Server Actions — Archive, Unarchive, Update

**Files:**
- Modify: `src/app/dashboard/admin/programs/actions.ts`

The file already has a `requireSuperAdmin()` helper and a `createCourseAction`. Add three exports below `createCourseAction`.

- [ ] **Step 1: Add `archiveCourseAction` and `unarchiveCourseAction`**

Append to `src/app/dashboard/admin/programs/actions.ts`:

```typescript
export async function archiveCourseAction(trackSlug: string): Promise<{ success: boolean; error?: string }> {
  const svc = await requireSuperAdmin();

  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) return { success: false, error: "Could not find Catalyst program." };

  const { error } = await svc
    .from("track_overrides")
    .update({ archived_at: new Date().toISOString() })
    .eq("program_id", catalystRow.id)
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[archiveCourseAction] failed:", error);
    return { success: false, error: "Failed to archive course." };
  }
  return { success: true };
}

export async function unarchiveCourseAction(trackSlug: string): Promise<{ success: boolean; error?: string }> {
  const svc = await requireSuperAdmin();

  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) return { success: false, error: "Could not find Catalyst program." };

  const { error } = await svc
    .from("track_overrides")
    .update({ archived_at: null })
    .eq("program_id", catalystRow.id)
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[unarchiveCourseAction] failed:", error);
    return { success: false, error: "Failed to unarchive course." };
  }
  return { success: true };
}
```

- [ ] **Step 2: Add `updateCourseAction`**

Append to the same file:

```typescript
export type UpdateCourseResult =
  | { success: true }
  | { success: false; error: string };

export async function updateCourseAction(
  trackSlug: string,
  formData: { name: string; instructor: string; totalWeeks: number; sessionsPerWeek: number },
): Promise<UpdateCourseResult> {
  const svc = await requireSuperAdmin();
  const { name, instructor, totalWeeks, sessionsPerWeek } = formData;

  if (!name.trim()) return { success: false, error: "Course name is required." };
  if (!instructor.trim()) return { success: false, error: "Instructor name is required." };
  if (!Number.isFinite(totalWeeks) || !Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 52)
    return { success: false, error: "Weeks must be between 1 and 52." };
  if (!Number.isFinite(sessionsPerWeek) || !Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7)
    return { success: false, error: "Sessions per week must be between 1 and 7." };

  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) return { success: false, error: "Could not find Catalyst program." };

  const { error } = await svc
    .from("track_overrides")
    .update({
      name: name.trim(),
      instructor: instructor.trim(),
      total_weeks: totalWeeks,
      sessions_per_week: sessionsPerWeek,
    })
    .eq("program_id", catalystRow.id)
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[updateCourseAction] failed:", error);
    return { success: false, error: "Failed to update course." };
  }
  return { success: true };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors related to the new actions.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/programs/actions.ts
git commit -m "feat: add archive, unarchive, and updateCourse server actions"
```

---

## Task 3: Update `courses-list.tsx` — Archive/Unarchive/Edit UI

**Files:**
- Modify: `src/app/dashboard/admin/programs/courses-list.tsx`

This is a `"use client"` component. Replace the entire file:

- [ ] **Step 1: Replace the full file**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveCourseAction, unarchiveCourseAction } from "./actions";

export type CourseRow = {
  slug: string;
  programSlug: string;
  name: string;
  joinUrl: string;
  archived: boolean;
  isEditable: boolean;
};

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

function CourseItem({ course }: { course: CourseRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCourse() {
    document.cookie = `program-override=${course.programSlug}; path=/; max-age=86400`;
    window.location.href = `/dashboard/admin?tab=${course.slug}`;
  }

  async function handleArchive() {
    setError(null);
    startTransition(async () => {
      const res = await archiveCourseAction(course.slug);
      if (res.success) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to archive.");
      }
    });
  }

  async function handleUnarchive() {
    setError(null);
    startTransition(async () => {
      const res = await unarchiveCourseAction(course.slug);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error ?? "Failed to unarchive.");
      }
    });
  }

  if (course.archived) {
    return (
      <div className="flex items-center gap-4 px-4 py-4 opacity-60">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-500">{course.name}</p>
          <p className="font-mono text-xs text-neutral-400 mt-0.5 truncate">{course.joinUrl}</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleUnarchive}
          className="shrink-0 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          {isPending ? "Restoring…" : "Unarchive"}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-1 px-4 py-4">
      <div className="flex items-center gap-4">
        <div
          onClick={openCourse}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <p className="text-sm font-semibold text-neutral-900 group-hover:text-[#E54D2E] transition-colors">
            {course.name}
          </p>
          <p className="font-mono text-xs text-neutral-400 mt-0.5 truncate">{course.joinUrl}</p>
        </div>
        <CopyButton url={course.joinUrl} />
        {course.isEditable && (
          <a
            href={`/dashboard/admin/programs/${course.slug}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Edit
          </a>
        )}
        <span
          onClick={openCourse}
          className="text-xs text-neutral-400 group-hover:text-[#E54D2E] transition-colors shrink-0 select-none cursor-pointer"
        >
          Manage →
        </span>
        {course.isEditable && !confirming && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="shrink-0 text-xs text-neutral-400 hover:text-red-600 transition-colors"
          >
            Archive
          </button>
        )}
      </div>

      {confirming && (
        <div className="flex items-center gap-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 mt-1">
          <p className="flex-1 text-xs text-red-700">
            Archive this course? Students will lose access immediately.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleArchive}
            className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "Archiving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="shrink-0 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function CoursesList({
  courses,
  archivedCourses,
}: {
  courses: CourseRow[];
  archivedCourses: CourseRow[];
}) {
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="space-y-4">
      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {courses.length === 0 && (
          <p className="px-4 py-6 text-sm text-neutral-400 text-center">No active courses.</p>
        )}
        {courses.map((c) => (
          <CourseItem key={c.slug} course={c} />
        ))}
      </div>

      {archivedCourses.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            {showArchived ? "▾" : "▸"} Archived ({archivedCourses.length})
          </button>
          {showArchived && (
            <div className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white overflow-hidden">
              {archivedCourses.map((c) => (
                <CourseItem key={c.slug} course={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/programs/courses-list.tsx
git commit -m "feat: add archive/unarchive/edit UI to courses list"
```

---

## Task 4: Update `programs/page.tsx` — Fetch `archived_at`, Split Lists

**Files:**
- Modify: `src/app/dashboard/admin/programs/page.tsx`

- [ ] **Step 1: Update the Supabase query and course splitting**

Replace the full file content:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";
import { CoursesList } from "./courses-list";
import type { CourseRow } from "./courses-list";

export default async function ProgramsListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // All courses are tracks inside Catalyst. Start with TS-config tracks.
  const catalyst = getProgramBySlug("catalyst");
  const tsTrackSlugs = new Set(catalyst.tracks.map((t) => t.slug));

  const tsCourses: CourseRow[] = catalyst.tracks.map((t) => ({
    slug: t.slug,
    programSlug: "catalyst",
    name: t.name,
    joinUrl: `https://bccacademy.io/join/catalyst?track=${t.slug}`,
    archived: false,
    isEditable: false,
  }));

  // Builder-created tracks: track_overrides rows under Catalyst not in TS config
  const svc = createServiceClient();
  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();

  let dynamicCourses: CourseRow[] = [];
  if (catalystRow) {
    const { data: overrides } = await svc
      .from("track_overrides")
      .select("track_slug, name, archived_at")
      .eq("program_id", catalystRow.id)
      .order("name");
    dynamicCourses = (overrides ?? [])
      .filter((o) => !tsTrackSlugs.has(o.track_slug as string))
      .map((o) => ({
        slug: o.track_slug as string,
        programSlug: "catalyst",
        name: (o.name as string | null) ?? (o.track_slug as string),
        joinUrl: `https://bccacademy.io/join/catalyst?track=${o.track_slug}`,
        archived: !!(o.archived_at),
        isEditable: true,
      }));
  }

  const allCourses = [...tsCourses, ...dynamicCourses].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const activeCourses = allCourses.filter((c) => !c.archived);
  const archivedCourses = allCourses.filter((c) => c.archived);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
          >
            ← Admin
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Courses</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Click any course to manage it, or copy its join link.
          </p>
        </div>
        <Link
          href="/dashboard/admin/programs/new"
          className="shrink-0 mt-1 rounded-lg bg-[#E54D2E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#F0613E] transition-colors"
        >
          New Course
        </Link>
      </div>

      <CoursesList courses={activeCourses} archivedCourses={archivedCourses} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/programs/page.tsx
git commit -m "feat: split courses list into active and archived sections"
```

---

## Task 5: Create Edit Page + Form

**Files:**
- Create: `src/app/dashboard/admin/programs/[slug]/edit/page.tsx`
- Create: `src/app/dashboard/admin/programs/[slug]/edit/edit-course-form.tsx`

- [ ] **Step 1: Create the server component (edit page)**

Create `src/app/dashboard/admin/programs/[slug]/edit/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";
import { EditCourseForm } from "./edit-course-form";

type OverrideRow = {
  track_slug: string;
  name: string | null;
  instructor: string | null;
  total_weeks: number | null;
  sessions_per_week: number | null;
};

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // Only builder-created courses can be edited — TS-config slugs are read-only
  const catalystTracks = getProgramBySlug("catalyst").tracks;
  if (catalystTracks.some((t) => t.slug === slug)) redirect("/dashboard/admin/programs");

  const svc = createServiceClient();
  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) redirect("/dashboard/admin/programs");

  const { data: override } = await svc
    .from("track_overrides")
    .select("track_slug, name, instructor, total_weeks, sessions_per_week")
    .eq("program_id", catalystRow.id)
    .eq("track_slug", slug)
    .maybeSingle<OverrideRow>();

  if (!override) redirect("/dashboard/admin/programs");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <Link
          href="/dashboard/admin/programs"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
        >
          ← Courses
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Edit Course</h1>
        <p className="mt-1 text-xs text-neutral-400 font-mono">{slug}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <EditCourseForm
          trackSlug={slug}
          initialName={override.name ?? ""}
          initialInstructor={override.instructor ?? ""}
          initialTotalWeeks={override.total_weeks ?? 1}
          initialSessionsPerWeek={override.sessions_per_week ?? 1}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the client component (edit form)**

Create `src/app/dashboard/admin/programs/[slug]/edit/edit-course-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { updateCourseAction } from "../../actions";
import type { UpdateCourseResult } from "../../actions";

export function EditCourseForm({
  trackSlug,
  initialName,
  initialInstructor,
  initialTotalWeeks,
  initialSessionsPerWeek,
}: {
  trackSlug: string;
  initialName: string;
  initialInstructor: string;
  initialTotalWeeks: number;
  initialSessionsPerWeek: number;
}) {
  const [name, setName] = useState(initialName);
  const [instructor, setInstructor] = useState(initialInstructor);
  const [totalWeeks, setTotalWeeks] = useState(String(initialTotalWeeks));
  const [sessionsPerWeek, setSessionsPerWeek] = useState(String(initialSessionsPerWeek));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res: UpdateCourseResult = await updateCourseAction(trackSlug, {
        name,
        instructor,
        totalWeeks: parseInt(totalWeeks, 10),
        sessionsPerWeek: parseInt(sessionsPerWeek, 10),
      });
      if (res.success) {
        setSaved(true);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Course Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="instructor" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Instructor
        </label>
        <input
          id="instructor"
          type="text"
          required
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="totalWeeks" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Length (weeks)
          </label>
          <input
            id="totalWeeks"
            type="number"
            required
            min={1}
            max={52}
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sessionsPerWeek" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Sessions / Week
          </label>
          <input
            id="sessionsPerWeek"
            type="number"
            required
            min={1}
            max={7}
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Changes saved
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-[#E54D2E] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#F0613E] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
        <a
          href="/dashboard/admin/programs"
          className="flex-1 flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Back to Courses
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/programs/\[slug\]/edit/page.tsx src/app/dashboard/admin/programs/\[slug\]/edit/edit-course-form.tsx
git commit -m "feat: add edit course page and form"
```

---

## Task 6: Student Access Gate — Track Page

**Files:**
- Modify: `src/app/dashboard/track/[slug]/page.tsx`

The track page server component currently renders the full curriculum for any enrolled student. We need to intercept before rendering and show a "course ended" message if the track is archived.

- [ ] **Step 1: Add the archived check**

At the top of `src/app/dashboard/track/[slug]/page.tsx`, add the `createServiceClient` import alongside the existing imports:

```typescript
import { createServiceClient } from "@/lib/supabase/server";
```

Then, directly after the block that gets `track` and `ctx` (after the `if (!track) redirect("/dashboard")` line), add the archived gate. Insert this block before the `single-event` redirect:

```typescript
  // Archived gate: non-admin students cannot view archived builder-created courses.
  if (!isAdminViewer) {
    const svc = createServiceClient();
    const { data: programRow } = await svc
      .from("programs")
      .select("id")
      .eq("slug", program.slug)
      .maybeSingle<{ id: string }>();
    if (programRow) {
      const { data: overrideRow } = await svc
        .from("track_overrides")
        .select("archived_at")
        .eq("program_id", programRow.id)
        .eq("track_slug", slug)
        .maybeSingle<{ archived_at: string | null }>();
      if (overrideRow?.archived_at) {
        return (
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16 text-center space-y-3">
            <p className="text-4xl">📦</p>
            <h1 className="text-xl font-bold text-neutral-900">This course has ended</h1>
            <p className="text-sm text-neutral-500">
              {track.name} is no longer active. Reach out to your instructor if you have questions.
            </p>
          </div>
        );
      }
    }
  }
```

Place this block immediately after:
```typescript
  const isAdminViewer = canAccessAdminPanel(ctx?.student?.role ?? "");
```
and before:
```typescript
  // Single-event tracks don't have weeks to scrub — send them straight to
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/track/\[slug\]/page.tsx
git commit -m "feat: show course-ended message for archived tracks"
```

---

## Task 7: Join Flow Guard — Block New Enrollments

**Files:**
- Modify: `src/app/join/[slug]/actions.ts`

The `sendJoinLink` function already imports `createServiceClient`. Add an archived check before the allowlist gate.

- [ ] **Step 1: Add the archived check**

In `src/app/join/[slug]/actions.ts`, inside `sendJoinLink`, insert this block immediately after the opening of the `if (trackSlug) {` block (before the allowlist `Promise.all` call):

```typescript
  if (trackSlug) {
    // Archived check: block new enrollments into archived courses.
    const svcCheck = createServiceClient();
    const { data: programRow } = await svcCheck
      .from("programs")
      .select("id")
      .eq("slug", programSlug)
      .maybeSingle<{ id: string }>();
    if (programRow) {
      const { data: archivedRow } = await svcCheck
        .from("track_overrides")
        .select("archived_at")
        .eq("program_id", programRow.id)
        .eq("track_slug", trackSlug)
        .maybeSingle<{ archived_at: string | null }>();
      if (archivedRow?.archived_at) {
        return { ok: false, error: "This course is no longer accepting new students." };
      }
    }
    // ... (existing allowlist gate continues below)
```

The existing `const svcAllow = createServiceClient()` and `Promise.all` allowlist block stays unchanged after this new block.

The full updated `if (trackSlug) {` section should look like:

```typescript
  if (trackSlug) {
    // Archived check: block new enrollments into archived courses.
    const svcCheck = createServiceClient();
    const { data: programRow } = await svcCheck
      .from("programs")
      .select("id")
      .eq("slug", programSlug)
      .maybeSingle<{ id: string }>();
    if (programRow) {
      const { data: archivedRow } = await svcCheck
        .from("track_overrides")
        .select("archived_at")
        .eq("program_id", programRow.id)
        .eq("track_slug", trackSlug)
        .maybeSingle<{ archived_at: string | null }>();
      if (archivedRow?.archived_at) {
        return { ok: false, error: "This course is no longer accepting new students." };
      }
    }

    const svcAllow = createServiceClient();
    const [{ count: allowlistSize, error: countErr }, { data: allowed, error: lookupErr }] = await Promise.all([
      svcAllow
        .from("allowed_signup_emails")
        .select("email", { count: "exact", head: true })
        .eq("track_slug", trackSlug),
      svcAllow
        .from("allowed_signup_emails")
        .select("email")
        .eq("track_slug", trackSlug)
        .eq("email", normalised)
        .maybeSingle(),
    ]);
    if (countErr || lookupErr) {
      console.error("[join] allowlist gate failed:", countErr ?? lookupErr);
      return { ok: false, error: "Couldn't verify your email. Please try again." };
    }
    if ((allowlistSize ?? 0) > 0 && !allowed) {
      console.warn("[join] blocked unallowlisted signup", {
        email: normalised,
        programSlug,
        trackSlug,
      });
      return { ok: false, rejected: true };
    }
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/join/\[slug\]/actions.ts
git commit -m "feat: block join for archived courses"
```

---

## Task 8: Manual Smoke Test

Start the dev server and test the golden paths:

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test archive flow**
  1. Log in as super-admin → `/dashboard/admin/programs`
  2. Find a builder-created course — confirm "Archive" and "Edit" buttons are visible; TS-config courses have neither
  3. Click "Archive" → confirm prompt appears
  4. Click "Confirm" → course disappears from active list
  5. Click "▸ Archived (1)" → course appears in archived section
  6. Click "Unarchive" → course returns to active list

- [ ] **Step 3: Test edit flow**
  1. Click "Edit" on a builder-created course → `/dashboard/admin/programs/[slug]/edit`
  2. Change total weeks → click "Save Changes" → "✓ Changes saved" appears
  3. Navigate to the course's manage tab → confirm week count updated

- [ ] **Step 4: Test student access gate**
  1. Archive a course
  2. Log in as a student enrolled in that course
  3. Navigate to `/dashboard/track/[slug]`
  4. Confirm "This course has ended" message renders (not the curriculum)

- [ ] **Step 5: Test join block**
  1. While a course is archived, attempt to join via its join URL
  2. Confirm error: "This course is no longer accepting new students."

- [ ] **Step 6: Final commit (if any tweaks were needed)**

```bash
git add -p
git commit -m "fix: smoke test tweaks for archive/edit courses"
```
