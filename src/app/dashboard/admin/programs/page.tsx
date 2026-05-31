import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";
import { CoursesList } from "./courses-list";
import type { CourseRow } from "./courses-list";

export default async function ProgramsListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // TS-config programs (Catalyst etc.) — shown with their real join structure
  const tsCourses: CourseRow[] = getAllPrograms()
    .filter((p) => p.tracks.length > 0)
    .flatMap((p) =>
      p.tracks.map((t) => ({
        slug: p.slug,
        name: t.name,
        joinUrl: `https://bccacademy.io/join/${p.slug}?track=${t.slug}`,
      }))
    );

  // Builder-created courses
  const svc = createServiceClient();
  const { data: dynamic } = await svc
    .from("programs")
    .select("slug, name")
    .eq("is_dynamic", true)
    .order("name");

  const dynamicCourses: CourseRow[] = (dynamic ?? []).map((p) => ({
    slug: p.slug as string,
    name: (p.name as string | null) ?? (p.slug as string),
    joinUrl: `https://bccacademy.io/join/${p.slug}`,
  }));

  const allCourses = [...dynamicCourses, ...tsCourses].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

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

      <CoursesList courses={allCourses} />
    </div>
  );
}
