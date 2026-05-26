import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";
import { getAllowedEmails } from "./actions";
import { AllowlistForm } from "./allowlist-form";

export const dynamic = "force-dynamic";

export default async function AllowlistAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/dashboard");
  }

  const { program: programParam } = await searchParams;
  const programs = getAllPrograms().filter((p) => p.slug !== "marketing");
  // Default to the program that actually enforces the gate. Falls back to
  // the first program in the list only when nothing is gated yet. Prevents
  // the previous failure mode where an admin uploaded a CSV into Catalyst
  // (alphabetically first) thinking it was Upskill Bahamas.
  const firstGated = programs.find((p) => p.requireAllowlist === true);
  const selectedSlug =
    programs.find((p) => p.slug === programParam)?.slug ??
    firstGated?.slug ??
    programs[0]?.slug ??
    "forte";
  const selectedProgram = programs.find((p) => p.slug === selectedSlug)!;

  const { emails } = await getAllowedEmails(selectedSlug);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Admin
      </Link>

      <header className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Signup allowlist · {selectedProgram.name}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Who can sign up for {selectedProgram.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 max-w-prose">
          Each program has its own allowlist. Paste emails (one per line) or
          upload a CSV — replacing the list clears the previous allowlist for{" "}
          <strong>{selectedProgram.name}</strong> only and blocks anyone not on
          the new list from signing up via{" "}
          <code className="font-mono text-[12px] bg-neutral-100 px-1 py-0.5">/join/{selectedSlug}</code>.
          Existing students remain unaffected.
        </p>
      </header>

      {programs.length > 1 && (
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2">
            Program
          </p>
          <div className="flex flex-wrap gap-2">
            {programs.map((p) => {
              const isActive = p.slug === selectedSlug;
              const isGated = p.requireAllowlist === true;
              return (
                <Link
                  key={p.slug}
                  href={`/dashboard/admin/allowlist?program=${p.slug}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {p.name}
                  {isGated && (
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-emerald-300" : "bg-emerald-500"
                      }`}
                      title="Gate is on"
                    />
                  )}
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
            Green dot = gate is on (the allowlist is enforced on /join).
          </p>
        </div>
      )}

      <AllowlistForm
        programSlug={selectedSlug}
        programName={selectedProgram.name}
        initialEmails={emails}
        requireAllowlist={selectedProgram.requireAllowlist === true}
      />
    </div>
  );
}
