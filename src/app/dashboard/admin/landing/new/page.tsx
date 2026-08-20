import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
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
  accent: "#1D59FF",
  formLabel: "",
  trackSlug: "",
  eventbriteEventId: "",
  embedHeight: null,
  schedule: [],
  secondaryCtaLabel: "",
  secondaryCtaUrl: "",
  partners: [],
  heroImageUrl: "",
  pageTheme: "",
  footerText: "",
  metaTitle: "",
  metaDescription: "",
  // MASS-style by default: the cohort sign-up form with a pick-a-date, content
  // sections under it, and an instructor card. Delete what a page doesn't need.
  nativeEnroll: true,
  sessions: [{ id: "", label: "" }],
  enrollCtaLabel: "Enroll",
  bodySections: [
    { heading: "Why it matters", body: "" },
    { heading: "What you'll build", body: "" },
  ],
  instructor: { name: "", role: "", bio: "", photoUrl: "" },
};

export default async function NewLandingPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader title="New landing page" subtitle="Starts unpublished — flip Published on when it's ready to go live." actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />} />
      </div>
      <LandingForm initial={EMPTY} />
    </div>
  );
}
