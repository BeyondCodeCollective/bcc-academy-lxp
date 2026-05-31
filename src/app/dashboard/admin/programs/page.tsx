import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";

type DynamicProgramRow = { id: string; slug: string; name: string | null };

export default async function ProgramsListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data: courses, error: dbError } = await svc
    .from("programs")
    .select("id, slug, name")
    .eq("is_dynamic", true)
    .order("name");
  if (dbError) console.error("[programs/page] DB error:", dbError);

  // No courses yet — skip the list and go straight to the creation form
  if (!dbError && (courses ?? []).length === 0) {
    redirect("/dashboard/admin/programs/new");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
          >
            ← Admin
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Courses
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Courses you&apos;ve created through the builder.
          </p>
        </div>
        <Link
          href="/dashboard/admin/programs/new"
          className="shrink-0 mt-1 rounded-lg bg-[#E54D2E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#F0613E] transition-colors"
        >
          New Course
        </Link>
      </div>

      {dbError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load courses — {dbError.message}
        </div>
      )}

      {!dbError && (
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {(courses as DynamicProgramRow[]).map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{c.name ?? c.slug}</p>
                <p className="font-mono text-xs text-neutral-500 mt-0.5">bccacademy.io/join/{c.slug}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
