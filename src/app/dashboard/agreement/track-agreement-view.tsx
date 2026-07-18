"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ParticipationAgreementModal } from "@/components/participation-agreement";

/**
 * The standalone-page wrapper around the cohort's own agreement modal — the
 * same component (and the same signParticipationAgreement path) the onboarding
 * checklist uses, so a learner arriving from an emailed agreement link signs
 * the document their track configures, not the Catalyst one.
 *
 * Closing (or finishing) drops them on their course, where the checklist shows
 * the item ticked off.
 */
export function TrackAgreementView({
  trackSlug,
  programSlug,
  cohort,
  defaultName,
}: {
  trackSlug: string;
  programSlug: string;
  cohort: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <ParticipationAgreementModal
      open={open}
      onClose={() => {
        setOpen(false);
        router.push(`/dashboard/track/${trackSlug}`);
      }}
      trackSlug={trackSlug}
      programSlug={programSlug}
      cohort={cohort}
      defaultName={defaultName}
    />
  );
}
