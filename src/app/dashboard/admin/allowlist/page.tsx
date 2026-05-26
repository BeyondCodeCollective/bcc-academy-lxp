import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";
import { getAllowedEmails } from "./actions";
import { AllowlistForm } from "./allowlist-form";
import { ProgramPicker } from "./program-picker";

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
    programs.find((p) => p.slug === programParam)?.slug ??
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
          Signup allowlist
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Who can sign up
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 max-w-prose">
          Each program has its own allowlist. Pick the program, paste emails
          or upload a CSV. If the list has any entries, only those addresses
          can sign up via{" "}
          <code className="font-mono text-[12px] bg-neutral-100 px-1 py-0.5">
            /join/{selectedSlug}
          </code>
          . If you clear it (save with an empty list), the gate turns off and
          anyone can sign up again. Existing students are unaffected.
        </p>
      </header>

      <div className="mb-6">
        <label
          htmlFor="program-picker"
          className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2"
        >
          Program
        </label>
        <ProgramPicker
          selectedSlug={selectedSlug}
          programs={programs.map((p) => ({ slug: p.slug, name: p.name }))}
        />
      </div>

      <AllowlistForm
        programSlug={selectedSlug}
        programName={selectedProgram.name}
        initialEmails={emails}
      />
    </div>
  );
}
