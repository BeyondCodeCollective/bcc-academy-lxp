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
  const selectedSlug =
    programs.find((p) => p.slug === programParam)?.slug ?? programs[0]?.slug ?? "forte";
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
          Signup allowlist
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Manage who can sign up
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 max-w-prose">
          Paste a list of emails (one per line) or upload a CSV. Replacing the
          list clears the previous allowlist for this program — anyone not on
          the new list will be blocked from signing up via /join/{selectedSlug}.
          Existing students remain unaffected; this gate only applies to new
          signups, and only when the program's <code className="font-mono text-[12px] bg-neutral-100 px-1 py-0.5">requireAllowlist</code> flag is on.
        </p>
      </header>

      {programs.length > 1 && (
        <div className="mb-6 flex gap-2">
          {programs.map((p) => (
            <Link
              key={p.slug}
              href={`/dashboard/admin/allowlist?program=${p.slug}`}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold transition-colors ${
                p.slug === selectedSlug
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {p.name}
            </Link>
          ))}
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
