// Track modality — the single property that decides which signal "counts" as
// engagement for a track. The whole analytics redesign keys off this so a live
// Zoom cohort is never judged by "videos watched" and a self-paced video track
// is never judged by attendance.
//
//   live      — meets on a schedule; engagement = attendance/participation.
//   on-demand — self-paced video; engagement = video progress.
//   hybrid    — both (recorded lessons AND live sessions); either signal counts.
//
// Derivation is intentionally simple and reads from existing config so no data
// migration is needed: a self-paced track is on-demand; anything that meets on a
// schedule (dated units or session-modeled) is live. `hybrid` is reserved for
// tracks explicitly flagged in the future; nothing sets it yet.

export type TrackModality = "live" | "on-demand" | "hybrid";

type ModalityInput = {
  selfPaced?: boolean;
  unitLabel?: string;
  weekSummaries?: { date?: string }[];
};

export function trackModality(track: ModalityInput): TrackModality {
  if (track.selfPaced) return "on-demand";
  return "live";
}

/** The signal that primarily indicates engagement for this modality. */
export function primaryEngagementSignal(
  modality: TrackModality,
): "attendance" | "video" {
  return modality === "on-demand" ? "video" : "attendance";
}

/** Whether a "Videos watched" column is meaningful for this track. */
export function showsVideoColumn(modality: TrackModality): boolean {
  return modality !== "live";
}
