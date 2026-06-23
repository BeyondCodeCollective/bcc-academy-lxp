import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../manage-menu";
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
  eventbriteEventId: "",
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
        <PageHeader title="New landing page" subtitle="Starts unpublished — flip Published on when it's ready to go live." actions={<ManageMenu />} />
      </div>
      <LandingForm initial={EMPTY} />
    </div>
  );
}
