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

      {dbError && (
        <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400">
          Could not load dynamic programs — {dbError.message}
        </div>
      )}

      {!dbError && (dynamicPrograms ?? []).length > 0 && (
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
