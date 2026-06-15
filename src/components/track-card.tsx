"use client";

import { toneForTrack } from "@/lib/track-visual";
import { CatalogCard } from "@/components/catalog-card";

type Props = {
  slug: string;
  name: string;
  instructor: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  started: boolean;
  weekOneTopic: string;
};

export function TrackCard({
  slug,
  name,
  instructor,
  totalWeeks,
  sessionsPerWeek,
  started,
}: Props) {
  return (
    <CatalogCard
      href={`/dashboard/track/${slug}`}
      tone={toneForTrack(slug)}
      iconSlug={slug}
      eyebrow={`${totalWeeks} weeks${sessionsPerWeek > 1 ? ` · ${sessionsPerWeek}×/wk` : ""}`}
      title={name}
      byline={`with ${instructor}`}
      status={started ? "In progress" : undefined}
    />
  );
}
