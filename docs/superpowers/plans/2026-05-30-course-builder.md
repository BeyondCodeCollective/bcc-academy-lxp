# Course Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Super-admins can create a new course (name, instructor, weeks, sessions/week) from a single form at `/dashboard/admin/programs/new`, get a copyable join link instantly, and have the course immediately resolvable by the runtime without a code deploy.

**Architecture:** Each course created through the builder is stored as a `programs` row with `is_dynamic = true` plus a corresponding `track_overrides` row (same slug). `resolveBaseProgram()` gains a DB fallback: when a cookie/header slug doesn't match any TS config, it queries the `programs` table. The join page and admin panel both already work with `ProgramConfig` objects — the only change is how those objects are constructed.

**Tech Stack:** Next.js App Router, Supabase (service client for writes, RLS-bypassed), React `useState` for form state, Next.js Server Actions for the create mutation, existing `canSwitchPrograms` role check.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/add_is_dynamic_to_programs.sql` | Create | Add `name` + `is_dynamic` columns to `programs` |
| `src/lib/programs/index.ts` | Modify | Add `hasTsConfigSlug()` helper |
| `src/lib/programs/server.ts` | Modify | Add `buildProgramFromDB()`, `fetchDynamicProgram()`, extend `resolveBaseProgram()` |
| `src/app/join/[slug]/page.tsx` | Modify | DB fallback before `notFound()` |
| `src/app/dashboard/admin/programs/actions.ts` | Create | `createCourseAction` server action |
| `src/app/dashboard/admin/programs/new/create-course-form.tsx` | Create | Client-side form component |
| `src/app/dashboard/admin/programs/new/page.tsx` | Create | Server wrapper: access check + render form |
| `src/app/dashboard/admin/programs/page.tsx` | Create | Programs list page |
| `src/app/dashboard/admin/admin-tabs.tsx` | Modify | Add "Manage Courses" link (super-admin only) |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/add_is_dynamic_to_programs.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/add_is_dynamic_to_programs.sql
-- Enables the course builder to create programs without a TS config file.
-- name: display name for DB-created programs (null = legacy hardcoded program).
-- is_dynamic: true means this program was created via the course builder and
--             its ProgramConfig is built entirely from DB rows at runtime.

alter table programs add column if not exists name text;
alter table programs add column if not exists is_dynamic boolean not null default false;

comment on column programs.name is 'Display name for DB-created (is_dynamic=true) programs.';
comment on column programs.is_dynamic is 'True for programs created via the course builder. False for legacy TS-config programs.';
```

- [ ] **Step 2: Apply the migration via Supabase CLI**

```bash
cd /Users/fonz.morris/conductor/workspaces/bcc-academy-lxp/paris
npx supabase db push
```

Expected: migration runs without error. Both columns appear in the `programs` table in the Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/add_is_dynamic_to_programs.sql
git commit -m "db: add name and is_dynamic columns to programs"
```

---

## Task 2: Add `hasTsConfigSlug` to programs index

**Files:**
- Modify: `src/lib/programs/index.ts`

`getProgramBySlug()` silently falls back to catalyst when a slug isn't found. We need a guard that tells us whether a slug is a real TS config before we try the DB.

- [ ] **Step 1: Add the helper after `getHomeProgramForTrack`**

In `src/lib/programs/index.ts`, add after the `getHomeProgramForTrack` function (before the `export type` line at the bottom):

```ts
/**
 * Returns true when the slug is a known TS-config program (PROGRAMS or
 * SPECIAL_CONFIGS). Used by resolveBaseProgram() to decide whether to
 * fall through to the DB lookup for is_dynamic programs.
 */
export function hasTsConfigSlug(slug: string): boolean {
  return slug in PROGRAMS || slug in SPECIAL_CONFIGS;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/fonz.morris/conductor/workspaces/bcc-academy-lxp/paris
pnpm tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/programs/index.ts
git commit -m "feat(programs): add hasTsConfigSlug helper"
```

---

## Task 3: Build `ProgramConfig` from DB and extend `resolveBaseProgram()`

**Files:**
- Modify: `src/lib/programs/server.ts`

This is the core runtime change. We add two things:
1. `fetchDynamicProgram(slug)` — queries `programs` + `track_overrides` and builds a `ProgramConfig`
2. Extend `resolveBaseProgram()` — when a cookie/header slug isn't a TS config, try `fetchDynamicProgram`

- [ ] **Step 1: Add the import for `hasTsConfigSlug`**

In `src/lib/programs/server.ts`, update the first import line:

```ts
import { getProgramBySlug, getProgramByDomain, isKnownProgramHost, hasTsConfigSlug } from "./index";
```

- [ ] **Step 2: Add the dynamic program cache and `buildTrackFromOverride` helper**

After the `_OVERRIDE_TTL` constant (line ~83), add:

```ts
// ─── Dynamic Program Resolution ──────────────────────────────────────────────

type DynamicProgramRow = { id: string; slug: string; name: string | null };

const _dynamicCache = new Map<string, { data: ProgramConfig | null; ts: number }>();
const _DYNAMIC_TTL = 60_000;

function buildTrackFromOverride(row: TrackOverrideRow): TrackConfig {
  return {
    slug: row.track_slug,
    name: row.name ?? row.track_slug,
    shortName: row.short_name ?? row.name ?? row.track_slug,
    description: row.description ?? undefined,
    type: "weekly",
    totalWeeks: row.total_weeks ?? 12,
    sessionsPerWeek: row.sessions_per_week ?? 2,
    startDate: row.start_date ?? "2099-01-01",
    startDateTbd: !row.start_date,
    instructor: row.instructor ?? "",
    sessionTimes: (row.session_times as string[] | null) ?? [],
    lastSessionDayOffset: row.last_session_day_offset ?? 0,
    weekSummaries: (row.week_summaries as { week: number; topic: string; icon: string }[] | null) ?? [],
    weeks: [],
    defaultReflectionPrompts: (row.default_reflection_prompts as string[] | null) ?? [],
    submissionsEnabled: row.submissions_enabled ?? true,
    reflectionsEnabled: row.reflections_enabled ?? true,
  };
}

function buildProgramFromDB(
  programRow: DynamicProgramRow,
  trackRows: TrackOverrideRow[],
): ProgramConfig {
  const displayName = programRow.name ?? programRow.slug;
  return {
    slug: programRow.slug,
    name: displayName,
    tagline: "",
    domain: "bccacademy.io",
    dnsReady: false,
    logo: "/catalyst/logo.svg",
    colors: {
      primary: "#E54D2E",
      primaryHover: "#F0613E",
      accent: "#E54D2E",
      tagline: "#888888",
    },
    defaultCohort: {
      name: "cohort-1",
      displayName: "Cohort 1",
      startDate: "2099-01-01",
      totalWeeks: trackRows[0] ? (trackRows[0].total_weeks ?? 12) : 12,
    },
    tracks: trackRows.map(buildTrackFromOverride),
    requireInviteLink: false,
    coppa: { required: false },
    seo: {
      title: displayName,
      description: "",
      ogTitle: displayName,
      ogDescription: "",
    },
    organization: "Beyond Code Collective",
  };
}

/**
 * Fetch a dynamic (DB-created) program by slug. Returns null when no
 * is_dynamic program with that slug exists. TTL-cached like track_overrides.
 */
async function fetchDynamicProgram(slug: string): Promise<ProgramConfig | null> {
  const cached = _dynamicCache.get(slug);
  if (cached && Date.now() - cached.ts < _DYNAMIC_TTL) return cached.data;

  try {
    const svc = createServiceClient();
    const { data: programRow } = await svc
      .from("programs")
      .select("id, slug, name")
      .eq("slug", slug)
      .eq("is_dynamic", true)
      .maybeSingle();

    if (!programRow) {
      _dynamicCache.set(slug, { data: null, ts: Date.now() });
      return null;
    }

    const { data: trackRows } = await svc
      .from("track_overrides")
      .select(
        "track_slug, name, short_name, description, instructor, start_date, total_weeks, sessions_per_week, last_session_day_offset, session_times, week_summaries, default_reflection_prompts, submissions_enabled, reflections_enabled",
      )
      .eq("program_id", programRow.id);

    const config = buildProgramFromDB(
      programRow as DynamicProgramRow,
      (trackRows ?? []) as TrackOverrideRow[],
    );
    _dynamicCache.set(slug, { data: config, ts: Date.now() });
    return config;
  } catch (err) {
    console.warn("[fetchDynamicProgram] failed for slug=%s:", slug, err);
    _dynamicCache.set(slug, { data: null, ts: Date.now() });
    return null;
  }
}
```

- [ ] **Step 3: Verify `TrackConfig` is already imported**

`server.ts` already has `import type { ProgramConfig, TrackConfig } from "./types"` at line 4 — no change needed. Confirm the import line still looks like:

```ts
import type { ProgramConfig, TrackConfig } from "./types";
```

If for any reason it's missing, add it after the `./index` import.

- [ ] **Step 4: Extend `resolveBaseProgram()` with DB fallback**

Replace the existing `resolveBaseProgram` function body:

```ts
async function resolveBaseProgram(): Promise<ProgramConfig> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";

  if (isKnownProgramHost(host)) {
    return getProgramByDomain(host);
  }

  const c = await cookies();

  // Helper: resolve a slug against TS configs first, then DB.
  // Falls back to null (not catalyst) so the caller can keep looking.
  const resolveSlug = async (slug: string): Promise<ProgramConfig | null> => {
    if (hasTsConfigSlug(slug)) return getProgramBySlug(slug);
    return fetchDynamicProgram(slug);
  };

  const overrideSlug = c.get("program-override")?.value;
  if (overrideSlug) {
    const resolved = await resolveSlug(overrideSlug);
    if (resolved) return resolved;
    // Stale cookie for an unknown slug — fall through.
  }

  const headerSlug = h.get("x-program-slug");
  if (headerSlug) {
    const resolved = await resolveSlug(headerSlug);
    if (resolved) return resolved;
  }

  const cookieSlug = c.get("program-slug")?.value;
  if (cookieSlug) {
    const resolved = await resolveSlug(cookieSlug);
    if (resolved) return resolved;
  }

  return getProgramByDomain(host);
}
```

- [ ] **Step 5: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no new errors. Fix any type mismatches (common: `TrackOverrideRow` missing `track_slug` — the DB query returns it but the type doesn't declare it; cast with `as TrackOverrideRow & { track_slug: string }`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/programs/server.ts src/lib/programs/index.ts
git commit -m "feat(programs): resolve DB-created courses at runtime"
```

---

## Task 4: Fix `/join/[slug]` for dynamic courses

**Files:**
- Modify: `src/app/join/[slug]/page.tsx`

The join page currently calls `notFound()` for any slug not in the static TS config list. Dynamic slugs need a DB fallback.

- [ ] **Step 1: Add the `fetchDynamicProgram` import**

At the top of `src/app/join/[slug]/page.tsx`, add:

```ts
import { getJoinablePrograms, getProgramBySlug, getTrackBySlug, getHomeProgramForTrack } from "@/lib/programs";
// Add this import:
import { fetchDynamicProgram } from "@/lib/programs/server";  // add named export in Task 3
```

Wait — `fetchDynamicProgram` is currently unexported in `server.ts`. Before doing this step, **export it** by changing its declaration in `server.ts`:

```ts
// Change:
async function fetchDynamicProgram(slug: string): Promise<ProgramConfig | null> {
// To:
export async function fetchDynamicProgram(slug: string): Promise<ProgramConfig | null> {
```

- [ ] **Step 2: Replace the slug-check guard in the page component**

In `src/app/join/[slug]/page.tsx`, replace:

```ts
  const allSlugs = new Set(getJoinablePrograms().map((p) => p.slug));
  if (!allSlugs.has(slug)) notFound();

  const program = getProgramBySlug(slug);
```

With:

```ts
  const tsSlugSet = new Set(getJoinablePrograms().map((p) => p.slug));
  let program: import("@/lib/programs").ProgramConfig;
  if (tsSlugSet.has(slug)) {
    program = getProgramBySlug(slug);
  } else {
    const dynamic = await fetchDynamicProgram(slug);
    if (!dynamic) notFound();
    program = dynamic;
  }
```

- [ ] **Step 3: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors. The `program` variable is now typed as `ProgramConfig` in both branches.

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Open `http://localhost:3000/join/catalyst` — should render normally (TS-config path unchanged). Open a non-existent slug like `http://localhost:3000/join/does-not-exist` — should render Next.js 404.

- [ ] **Step 5: Commit**

```bash
git add src/app/join/[slug]/page.tsx src/lib/programs/server.ts
git commit -m "feat(join): DB fallback for dynamic course slugs"
```

---

## Task 5: `createCourseAction` server action

**Files:**
- Create: `src/app/dashboard/admin/programs/actions.ts`

The mutation that validates uniqueness, writes to `programs` + `track_overrides`, and returns the join URL.

- [ ] **Step 1: Create the actions file**

```ts
// src/app/dashboard/admin/programs/actions.ts
"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasCapability } from "@/lib/roles";
import { hasTsConfigSlug } from "@/lib/programs";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (!hasCapability(student?.role ?? "", "switch_programs")) {
    throw new Error("Not authorized");
  }
  return svc;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type CreateCourseResult =
  | { success: true; slug: string; joinUrl: string }
  | { success: false; error: string };

export async function createCourseAction(formData: {
  name: string;
  instructor: string;
  totalWeeks: number;
  sessionsPerWeek: number;
}): Promise<CreateCourseResult> {
  const svc = await requireSuperAdmin();

  const { name, instructor, totalWeeks, sessionsPerWeek } = formData;

  if (!name.trim()) return { success: false, error: "Course name is required." };
  if (!instructor.trim()) return { success: false, error: "Instructor name is required." };
  if (totalWeeks < 1 || totalWeeks > 52) return { success: false, error: "Weeks must be between 1 and 52." };
  if (sessionsPerWeek < 1 || sessionsPerWeek > 7) return { success: false, error: "Sessions per week must be between 1 and 7." };

  const slug = toSlug(name);
  if (!slug) return { success: false, error: "Could not derive a valid slug from the course name." };

  // Uniqueness check: TS configs
  if (hasTsConfigSlug(slug)) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  // Uniqueness check: DB
  const { data: existing } = await svc
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  // Insert program row
  const { data: newProgram, error: programError } = await svc
    .from("programs")
    .insert({ slug, name: name.trim(), is_dynamic: true })
    .select("id")
    .single<{ id: string }>();

  if (programError || !newProgram) {
    console.error("[createCourseAction] programs insert failed:", programError);
    return { success: false, error: "Failed to create course. Please try again." };
  }

  // Insert track_overrides row (track slug = program slug for single-track courses)
  const { error: trackError } = await svc
    .from("track_overrides")
    .insert({
      program_id: newProgram.id,
      track_slug: slug,
      name: name.trim(),
      instructor: instructor.trim(),
      total_weeks: totalWeeks,
      sessions_per_week: sessionsPerWeek,
    });

  if (trackError) {
    // Best-effort cleanup: delete the orphaned program row
    await svc.from("programs").delete().eq("id", newProgram.id);
    console.error("[createCourseAction] track_overrides insert failed:", trackError);
    return { success: false, error: "Failed to save track details. Please try again." };
  }

  return {
    success: true,
    slug,
    joinUrl: `bccacademy.io/join/${slug}`,
  };
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/programs/actions.ts
git commit -m "feat(courses): createCourseAction server action"
```

---

## Task 6: `CreateCourseForm` client component

**Files:**
- Create: `src/app/dashboard/admin/programs/new/create-course-form.tsx`

The interactive form. Slug preview updates live as the user types. On success, replaces the form with a join-link banner.

- [ ] **Step 1: Create the component**

```tsx
// src/app/dashboard/admin/programs/new/create-course-form.tsx
"use client";

import { useState } from "react";
import { createCourseAction } from "../actions";
import type { CreateCourseResult } from "../actions";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateCourseForm() {
  const [name, setName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [totalWeeks, setTotalWeeks] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CreateCourseResult, { success: true }> | null>(null);

  const slug = toSlug(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await createCourseAction({
      name,
      instructor,
      totalWeeks: parseInt(totalWeeks, 10),
      sessionsPerWeek: parseInt(sessionsPerWeek, 10),
    });

    setPending(false);

    if (res.success) {
      setResult(res);
    } else {
      setError(res.error);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-800 bg-green-950 p-5">
          <p className="text-sm font-semibold text-green-400">Course created</p>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-green-900 bg-black/40 px-4 py-3">
            <span className="flex-1 font-mono text-sm text-green-300">{result.joinUrl}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(`https://${result.joinUrl}`)}
              className="shrink-0 rounded bg-green-900 px-3 py-1 text-xs font-semibold text-green-300 hover:bg-green-800"
            >
              Copy link
            </button>
          </div>
          <p className="mt-3 text-xs text-green-700">
            Share this link to start enrolling students. Switch to this course in the admin panel to manage it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setResult(null); setName(""); setInstructor(""); setTotalWeeks(""); setSessionsPerWeek(""); }}
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          Create another course
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Course Name
        </label>
        <input
          id="name"
          type="text"
          required
          placeholder="e.g. Salesforce Admin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-[#E54D2E]"
        />
        {slug && (
          <p className="font-mono text-xs text-neutral-600">
            bccacademy.io/join/<span className="text-[#E54D2E]">{slug}</span>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="instructor" className="block text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Instructor
        </label>
        <input
          id="instructor"
          type="text"
          required
          placeholder="e.g. Marcus Williams"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-[#E54D2E]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="totalWeeks" className="block text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Length (weeks)
          </label>
          <input
            id="totalWeeks"
            type="number"
            required
            min={1}
            max={52}
            placeholder="12"
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-[#E54D2E]"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sessionsPerWeek" className="block text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Sessions / Week
          </label>
          <input
            id="sessionsPerWeek"
            type="number"
            required
            min={1}
            max={7}
            placeholder="2"
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-[#E54D2E]"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#E54D2E] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#F0613E] disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create Course"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/programs/new/create-course-form.tsx
git commit -m "feat(courses): CreateCourseForm client component"
```

---

## Task 7: Course creation page

**Files:**
- Create: `src/app/dashboard/admin/programs/new/page.tsx`

Server component: enforces super-admin access, renders the form inside a centered card.

- [ ] **Step 1: Create the page**

```tsx
// src/app/dashboard/admin/programs/new/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { CreateCourseForm } from "./create-course-form";

export default async function NewCoursePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12">
      <div>
        <Link
          href="/dashboard/admin/programs"
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          ← All Programs
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-100">
          New Course
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Takes about 30 seconds.</p>
      </div>
      <CreateCourseForm />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/dashboard/admin/programs/new`. Confirm: super-admin sees the form; non-super-admin gets redirected to `/dashboard/admin`.

Fill in all 4 fields and click "Create Course". Confirm:
- Success banner appears with `bccacademy.io/join/<slug>`
- Copy button works
- Navigate to `http://localhost:3000/join/<slug>` — join page renders (not 404)
- Test duplicate: try creating another course with the same name — error message appears

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/programs/new/page.tsx
git commit -m "feat(courses): new course page at /dashboard/admin/programs/new"
```

---

## Task 8: Programs list page

**Files:**
- Create: `src/app/dashboard/admin/programs/page.tsx`

A simple directory: hardcoded programs (read-only) and DB-created courses (with "New Course" CTA).

- [ ] **Step 1: Create the page**

```tsx
// src/app/dashboard/admin/programs/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";

type DynamicProgramRow = { id: string; slug: string; name: string | null };

export default async function ProgramsListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data: dynamicPrograms } = await svc
    .from("programs")
    .select("id, slug, name")
    .eq("is_dynamic", true)
    .order("name");

  const tsPrograms = getAllPrograms();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/admin" className="text-xs text-neutral-500 hover:text-neutral-300">
            ← Admin
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-100">Programs</h1>
          <p className="mt-1 text-sm text-neutral-500">All programs on the platform.</p>
        </div>
        <Link
          href="/dashboard/admin/programs/new"
          className="rounded-lg bg-[#E54D2E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#F0613E]"
        >
          New Course
        </Link>
      </div>

      {(dynamicPrograms ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Created via Builder
          </h2>
          <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
            {(dynamicPrograms as DynamicProgramRow[]).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-100">{p.name ?? p.slug}</p>
                  <p className="font-mono text-xs text-neutral-600">bccacademy.io/join/{p.slug}</p>
                </div>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                  dynamic
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Hardcoded (read-only)
        </h2>
        <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
          {tsPrograms.map((p) => (
            <div key={p.slug} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-100">{p.name}</p>
                <p className="font-mono text-xs text-neutral-600">{p.slug}</p>
              </div>
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                config
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/dashboard/admin/programs`. Confirm: hardcoded programs list renders. After creating a course in Task 7, confirm it appears in the "Created via Builder" section.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/programs/page.tsx
git commit -m "feat(courses): programs list at /dashboard/admin/programs"
```

---

## Task 9: Entry point in admin home

**Files:**
- Modify: `src/app/dashboard/admin/admin-tabs.tsx`

Add a "Manage Courses" link in the admin home header, visible only to super-admins.

- [ ] **Step 1: Find the admin home header right-side actions area**

In `src/app/dashboard/admin/admin-tabs.tsx`, locate the header at line ~807:

```tsx
<header className="flex items-start justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
      Admin
    </h1>
    ...
  </div>
  <div className="flex items-center gap-0.5 pt-1">
    <Link
      href="/dashboard/admin?tab=students"
      title="All people"
```

- [ ] **Step 2: Add the "Manage Courses" link**

Inside the right-side `<div className="flex items-center gap-0.5 pt-1">`, add the new link **before** the existing ones:

```tsx
{canSwitchPrograms(userRole) && (
  <a
    href="/dashboard/admin/programs"
    className="mr-2 flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
  >
    Manage Courses
  </a>
)}
```

- [ ] **Step 3: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/dashboard/admin`. Confirm:
- Super-admin sees "Manage Courses" button in the top-right of the admin home header
- Clicking it navigates to `/dashboard/admin/programs`
- Non-super-admin (instructor/admin role) does NOT see the button

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/admin-tabs.tsx
git commit -m "feat(courses): add Manage Courses entry point for super-admins"
```

---

## Task 10: End-to-end smoke test

Full walkthrough to confirm all pieces work together.

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Create a course**

1. Log in as a super-admin
2. Go to `/dashboard/admin` → click "Manage Courses" → click "New Course"
3. Fill in: Name = "Test Course 101", Instructor = "Jane Smith", Weeks = 8, Sessions/Week = 2
4. Click "Create Course"
5. Confirm: success banner shows `bccacademy.io/join/test-course-101`
6. Click "Copy link" — clipboard should contain `https://bccacademy.io/join/test-course-101`

- [ ] **Step 3: Verify the join page**

Navigate to `http://localhost:3000/join/test-course-101`. Confirm: join page renders with "Test Course 101" as the program name (not a 404).

- [ ] **Step 4: Verify the admin panel can switch to the new course**

1. Open the program switcher (user menu in the sidebar)
2. Switch to "Test Course 101"
3. Navigate to `/dashboard/admin`
4. Confirm: admin panel renders for the new course (empty tracks/students is expected)

- [ ] **Step 5: Verify duplicate detection**

Go back to `/dashboard/admin/programs/new`. Try creating a course called "Test Course 101" again. Confirm: error message appears ("A course with this name already exists").

- [ ] **Step 6: Verify the programs list**

Navigate to `/dashboard/admin/programs`. Confirm: "Test Course 101" appears in the "Created via Builder" section. Hardcoded programs appear in the "Hardcoded (read-only)" section.

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix(courses): e2e smoke test fixes"
```
