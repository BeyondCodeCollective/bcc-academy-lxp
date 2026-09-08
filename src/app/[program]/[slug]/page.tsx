import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildLandingMetadata, LandingView } from "../../bcc/[slug]/landing-view";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";

// A campaign page wearing its program's name: /bgc/shes-built-for-this rather
// than /bcc/shes-built-for-this. "bcc" is Beyond Code Collective — the
// platform, not the program — so a Black Girls Code campaign was published
// under someone else's initials, on the URL that goes on the flyer.
//
// This sits at the root, so it is the last route Next tries: every static
// segment (/dashboard, /apply, /join, /bcc, …) wins over it, and a two-segment
// path that matches no program and no page 404s exactly as it did before.

export const dynamic = "force-dynamic";

/** Memoized per request: generateMetadata and the page both call this, and
 *  both also call getLandingPage. Un-memoized that was four sequential
 *  Supabase round trips to render one page — measured at 1.5-2.7s TTFB on
 *  /bgc/shes-built-for-this against 0.2s for /bcc/mass, which skips the
 *  program check. React's cache() collapses each pair into one call.
 *
 *  Is this first segment a real program slug? Checked against the DB so a
 *  program created in the admin panel needs no deploy to get its own URLs. */
const isProgramSlug = cache(async function isProgramSlug(slug: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("programs")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  return !!data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ program: string; slug: string }>;
}): Promise<Metadata> {
  const { program, slug } = await params;
  if (!(await isProgramSlug(program))) return { title: "Not found" };
  return buildLandingMetadata(slug);
}

export default async function ProgramLandingPage({
  params,
}: {
  params: Promise<{ program: string; slug: string }>;
}) {
  const { program, slug } = await params;
  if (!(await isProgramSlug(program))) notFound();
  return <LandingView slug={slug} prefix={program} />;
}
