import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { LandingForm } from "../landing-form";
import type { LandingFormInitial } from "../landing-form";
import type { ScheduleDay, LandingPartner } from "@/lib/landing-pages";
import { DeleteLandingButton } from "../delete-landing-button";

export const dynamic = "force-dynamic";

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
  const { data } = await svc
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();

  const initial: LandingFormInitial = {
    slug: data.slug as string,
    published: (data.published as boolean) ?? false,
    headerLabel: (data.header_label as string | null) ?? "BCC Academy",
    eyebrow: (data.eyebrow as string | null) ?? "",
    headline: (data.headline as string | null) ?? "",
    subhead: (data.subhead as string | null) ?? "",
    accent: (data.accent as string | null) ?? "#1a1a1a",
    formLabel: (data.form_label as string | null) ?? "",
    trackSlug: (data.track_slug as string | null) ?? "",
    schedule: (data.schedule as ScheduleDay[] | null) ?? [],
    secondaryCtaLabel: (data.secondary_cta_label as string | null) ?? "",
    secondaryCtaUrl: (data.secondary_cta_url as string | null) ?? "",
    partners: (data.partners as LandingPartner[] | null) ?? [],
    heroImageUrl: (data.hero_image_url as string | null) ?? "",
    footerText: (data.footer_text as string | null) ?? "",
    metaTitle: (data.meta_title as string | null) ?? "",
    metaDescription: (data.meta_description as string | null) ?? "",
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader
          title="Edit landing page"
          subtitle={`/camp/${initial.slug}`}
          actions={<DeleteLandingButton slug={initial.slug} />}
        />
      </div>
      <LandingForm initial={initial} originalSlug={initial.slug} />
    </div>
  );
}
