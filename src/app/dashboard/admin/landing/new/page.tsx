import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../manage-menu";
import { LandingForm } from "../landing-form";
import type { LandingFormInitial } from "../landing-form";


/** Every program, for the landing form's owner picker. The picker decides the
 *  page's URL brand segment, so it reads the live table — a program created in
 *  the admin panel gets its own campaign URLs with no deploy. */
async function listPrograms(): Promise<{ slug: string; name: string }[]> {
  const svc = createServiceClient();
  const { data } = await svc.from("programs").select("slug, name").order("name");
  return (data ?? []) as { slug: string; name: string }[];
}

const EMPTY: LandingFormInitial = {
  slug: "",
  programSlug: "",
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
  logoUrl: "",
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

  const programs = await listPrograms();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader title="New landing page" subtitle="Starts unpublished — flip Published on when it's ready to go live." actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />} />
      </div>
      <LandingForm initial={EMPTY} programs={programs} />
    </div>
  );
}
