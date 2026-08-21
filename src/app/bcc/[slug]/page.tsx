import type { Metadata } from "next";
import { buildLandingMetadata, LandingView } from "./landing-view";

// Platform campaign pages, and the legacy path for every page that has since
// been given a program — LandingView redirects those to /<program>/<slug>.
// This static segment wins over /[program]/[slug], which is what keeps "bcc"
// from ever being resolved as a program slug.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildLandingMetadata(slug);
}

export default async function BccLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LandingView slug={slug} prefix="bcc" />;
}
