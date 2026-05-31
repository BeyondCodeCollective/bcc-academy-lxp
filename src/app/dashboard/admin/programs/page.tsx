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
  const { data: dynamicPrograms, error: dbError } = await svc
    .from("programs")
    .select("id, slug, name")
    .eq("is_dynamic", true)
    .order("name");
  if (dbError) console.error("[programs/page] DB error:", dbError);

  const tsPrograms = getAllPrograms();

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
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400 mb-1">
            Super Admin
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Programs
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            All programs on the platform.
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
          Could not load dynamic programs — {dbError.message}
        </div>
      )}

      {!dbError && (dynamicPrograms ?? []).length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
            Created via Builder
          </p>
          <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {(dynamicPrograms as DynamicProgramRow[]).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{p.name ?? p.slug}</p>
                  <p className="font-mono text-xs text-neutral-500 mt-0.5">bccacademy.io/join/{p.slug}</p>
                </div>
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                  dynamic
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
          Hardcoded (read-only)
        </p>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {tsPrograms.map((p) => (
            <div key={p.slug} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                <p className="font-mono text-xs text-neutral-500 mt-0.5">{p.slug}</p>
              </div>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                config
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
