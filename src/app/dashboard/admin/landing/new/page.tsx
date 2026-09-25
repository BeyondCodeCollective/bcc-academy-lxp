import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../manage-menu";
import { LandingForm } from "../landing-form";
import type { LandingFormInitial } from "../landing-form";
import { requireManager, allowedProgramIdsForActor } from "../../actions-shared";


/** Programs for the landing form's owner picker: every one for a super-admin,
 *  the actor's own for a program admin. The picker decides the page's URL
 *  brand segment, so it reads the live table — a program created in the admin
 *  panel gets its own campaign URLs with no deploy. */
async function listPrograms(allowedIds: string[] | null): Promise<{ slug: string; name: string }[]> {
  const svc = createServiceClient();
  let query = svc.from("programs").select("slug, name").order("name");
  if (allowedIds !== null) query = query.in("id", allowedIds);
  const { data } = await query;
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
  comingSoon: false,
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
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const actor = await requireManager();
  const allowedIds = allowedProgramIdsForActor(actor);
  const programs = await listPrograms(allowedIds);
  // A program admin's page is always theirs: preselect the program and hide
  // the platform option, so the picker can't be left on /bcc/.
  const scoped = allowedIds !== null;
  const initial = scoped ? { ...EMPTY, programSlug: programs[0]?.slug ?? "" } : EMPTY;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader title="New landing page" subtitle="Starts unpublished — flip Published on when it's ready to go live." actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />} />
      </div>
      <LandingForm initial={initial} programs={programs} allowPlatform={!scoped} />
    </div>
  );
}
