"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canManageRoles } from "@/lib/roles";
import { hasTsConfigSlug } from "@/lib/programs";
import { toSlug } from "@/lib/programs/slug";

// Master tier only — the platform owner, gated by EMAIL rather than a DB role
// so no super-admin can self-grant it by editing the students table. Creating
// an organization spans every program and every tenant, so it sits with role
// management rather than with per-program admin.
async function requireMaster() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (!canManageRoles(user.email)) {
    throw new Error("Not authorized");
  }
  return createServiceClient();
}

export type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  courseCount: number;
  landingPublished: boolean | null;
  accent: string | null;
  logoUrl: string | null;
};

/**
 * Organizations created in the admin — `programs` rows with is_dynamic = true.
 * These resolve through fetchDynamicProgram() rather than a TypeScript config,
 * so a new one needs no deploy. The legacy TS-config programs (catalyst, bgc,
 * forte, …) are deliberately excluded: they're code, not data, and editing
 * them here would silently do nothing.
 */
export async function listOrganizations(): Promise<OrganizationRow[]> {
  const svc = await requireMaster();

  const { data: rows } = await svc
    .from("programs")
    .select("id, slug, name, accent, logo_url")
    .eq("is_dynamic", true)
    .order("created_at", { ascending: true });

  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const slugs = rows.map((r) => r.slug as string);

  const { data: tracks } = await svc
    .from("track_overrides")
    .select("program_id")
    .in("program_id", ids);

  const { data: landings } = await svc
    .from("landing_pages")
    .select("slug, published")
    .in("slug", slugs);

  const countByProgram = new Map<string, number>();
  for (const t of tracks ?? []) {
    const key = t.program_id as string;
    countByProgram.set(key, (countByProgram.get(key) ?? 0) + 1);
  }
  const publishedBySlug = new Map<string, boolean>();
  for (const l of landings ?? []) {
    publishedBySlug.set(l.slug as string, l.published as boolean);
  }

  return rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    courseCount: countByProgram.get(r.id as string) ?? 0,
    landingPublished: publishedBySlug.get(r.slug as string) ?? null,
    accent: (r.accent as string | null) ?? null,
    logoUrl: (r.logo_url as string | null) ?? null,
  }));
}

export type CreateOrganizationResult =
  | { success: true; slug: string; joinUrl: string; landingUrl: string | null }
  | { success: false; error: string };

export async function createOrganizationAction(formData: {
  name: string;
  /** Optional headline for the seeded landing page. Falls back to the name. */
  headline?: string;
  /** Seed an unpublished landing page alongside the org. Defaults to true. */
  seedLandingPage?: boolean;
  /** Brand accent (6-digit hex). Null/absent = platform default cobalt. */
  accent?: string;
}): Promise<CreateOrganizationResult> {
  const svc = await requireMaster();

  const name = formData.name.trim();
  if (!name) return { success: false, error: "Organization name is required." };
  if (name.length > 80) return { success: false, error: "Organization name must be 80 characters or fewer." };

  const slug = toSlug(name);
  if (!slug) return { success: false, error: "Could not derive a valid slug from that name." };

  // A dynamic org can never take a TS-config slug: getProgramBySlug() checks
  // the TS registry first, so the hardcoded config would always win and the
  // new org would be silently unreachable.
  if (hasTsConfigSlug(slug)) {
    return { success: false, error: `"${slug}" is reserved by an existing built-in program.` };
  }

  const { data: existing } = await svc
    .from("programs")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return { success: false, error: `An organization with this name already exists (slug: ${slug}).` };
  }

  const accent = formData.accent?.trim() || null;
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return { success: false, error: "Accent must be a 6-digit hex color (e.g. #1D59FF)." };
  }

  const { error: insertError } = await svc
    .from("programs")
    .insert({ slug, name, is_dynamic: true, accent });

  if (insertError) {
    console.error("[createOrganizationAction] programs insert failed:", insertError);
    return { success: false, error: "Failed to create the organization. Please try again." };
  }

  // Seed an UNPUBLISHED landing page so the org has a public face ready to
  // edit, but nothing goes live until someone publishes it deliberately.
  let landingUrl: string | null = null;
  if (formData.seedLandingPage !== false) {
    const { error: landingError } = await svc
      .from("landing_pages")
      .insert({
        slug,
        published: false,
        header_label: name,
        headline: formData.headline?.trim() || name,
        accent: accent ?? "#1D59FF",
      });
    if (landingError) {
      // Non-fatal: the org itself exists and works. Surfacing a hard failure
      // here would strand a half-created org behind an error screen.
      console.warn("[createOrganizationAction] landing_pages seed failed:", landingError);
    } else {
      landingUrl = `/dashboard/admin/landing/${slug}`;
    }
  }

  revalidatePath("/dashboard/admin/organizations", "page");
  revalidatePath("/dashboard/admin", "page");

  return {
    success: true,
    slug,
    joinUrl: `https://bccacademy.io/join/${slug}`,
    landingUrl,
  };
}

/**
 * Update an organization's branding (accent color + logo). Applies to the
 * logged-in portal skin on the next request; the landing page keeps its own
 * accent field so a published page never changes out from under you.
 */
export async function updateOrganizationBrandingAction(
  slug: string,
  branding: { accent?: string | null; logoUrl?: string | null },
): Promise<{ success: boolean; error?: string }> {
  const svc = await requireMaster();

  const accent = branding.accent?.trim() || null;
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return { success: false, error: "Accent must be a 6-digit hex color (e.g. #1D59FF)." };
  }
  const logoUrl = branding.logoUrl?.trim() || null;

  const { error } = await svc
    .from("programs")
    .update({ accent, logo_url: logoUrl })
    .eq("slug", slug)
    .eq("is_dynamic", true);
  if (error) {
    console.error("[updateOrganizationBrandingAction] failed:", error);
    return { success: false, error: "Failed to save branding." };
  }

  revalidatePath("/dashboard/admin/organizations", "page");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
