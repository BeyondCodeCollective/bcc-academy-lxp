import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { LandingForm } from "../landing-form";
import type { LandingFormInitial } from "../landing-form";

const EMPTY: LandingFormInitial = {
  slug: "",
  published: false,
  headerLabel: "BCC Academy",
  eyebrow: "",
  headline: "",
  subhead: "",
  accent: "#E54D2E",
  formLabel: "",
  trackSlug: "",
  schedule: [],
  secondaryCtaLabel: "",
  secondaryCtaUrl: "",
  partners: [],
  heroImageUrl: "",
  footerText: "",
  metaTitle: "",
  metaDescription: "",
};

export default async function NewLandingPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <Link
          href="/dashboard/admin/landing"
          className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors mb-4"
        >
          ← Landing pages
        </Link>
        <PageHeader title="New landing page" subtitle="Starts unpublished — flip Published on when it's ready to go live." />
      </div>
      <LandingForm initial={EMPTY} />
    </div>
  );
}
