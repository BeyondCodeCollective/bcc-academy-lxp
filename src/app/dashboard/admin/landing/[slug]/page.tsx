import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { LandingForm } from "../landing-form";
import type { LandingFormInitial } from "../landing-form";
import { embeddedProgramSlug } from "@/lib/landing-pages";
import type { ScheduleDay, LandingPartner, LandingSession, LandingSection, LandingInstructor } from "@/lib/landing-pages";
import { DeleteLandingButton } from "../delete-landing-button";
import { ManageMenu } from "../../manage-menu";

export const dynamic = "force-dynamic";

/** Every program, for the landing form's owner picker. The picker decides the
 *  page's URL brand segment, so it reads the live table — a program created in
 *  the admin panel gets its own campaign URLs with no deploy. */
async function listPrograms(): Promise<{ slug: string; name: string }[]> {
  const svc = createServiceClient();
  const { data } = await svc.from("programs").select("slug, name").order("name");
  return (data ?? []) as { slug: string; name: string }[];
}


export default async function EditLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { slug } = await params;
  const svc = createServiceClient();
  // Fetch directly (not getLandingPage) so unpublished drafts are editable too.
  const [{ data }, programs] = await Promise.all([
    svc.from("landing_pages").select("*, programs(slug)").eq("slug", slug).maybeSingle(),
    listPrograms(),
  ]);
  if (!data) notFound();

  const initial: LandingFormInitial = {
    slug: data.slug as string,
    programSlug: embeddedProgramSlug(data.programs) ?? "",
    published: (data.published as boolean) ?? false,
    headerLabel: (data.header_label as string | null) ?? "BCC Academy",
    eyebrow: (data.eyebrow as string | null) ?? "",
    headline: (data.headline as string | null) ?? "",
    subhead: (data.subhead as string | null) ?? "",
    accent: (data.accent as string | null) ?? "#1a1a1a",
    formLabel: (data.form_label as string | null) ?? "",
    trackSlug: (data.track_slug as string | null) ?? "",
    eventbriteEventId: (data.eventbrite_event_id as string | null) ?? "",
    embedHeight: (data.embed_height as number | null) ?? null,
    schedule: (data.schedule as ScheduleDay[] | null) ?? [],
    secondaryCtaLabel: (data.secondary_cta_label as string | null) ?? "",
    secondaryCtaUrl: (data.secondary_cta_url as string | null) ?? "",
    partners: (data.partners as LandingPartner[] | null) ?? [],
    heroImageUrl: (data.hero_image_url as string | null) ?? "",
    logoUrl: (data.logo_url as string | null) ?? "",
    pageTheme: (data.page_theme as string | null) ?? "",
    footerText: (data.footer_text as string | null) ?? "",
    metaTitle: (data.meta_title as string | null) ?? "",
    metaDescription: (data.meta_description as string | null) ?? "",
    nativeEnroll: (data.native_enroll as boolean | null) ?? false,
    sessions: ((data.sessions as LandingSession[] | null) ?? []).map((x) => ({ id: x.id, label: x.label })),
    enrollCtaLabel: (data.enroll_cta_label as string | null) ?? "",
    bodySections: (data.body_sections as LandingSection[] | null) ?? [],
    instructor: (() => {
      const i = data.instructor as LandingInstructor | null;
      return { name: i?.name ?? "", role: i?.role ?? "", bio: i?.bio ?? "", photoUrl: i?.photoUrl ?? "" };
    })(),
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader
          title="Edit landing page"
          subtitle={`/${initial.programSlug || "bcc"}/${initial.slug}`}
          actions={
            <div className="flex items-center gap-2">
              <DeleteLandingButton slug={initial.slug} />
              <ManageMenu isMaster={canManageRoles(ctx.userEmail)} />
            </div>
          }
        />
      </div>
      <LandingForm initial={initial} originalSlug={initial.slug} programs={programs} />
    </div>
  );
}
