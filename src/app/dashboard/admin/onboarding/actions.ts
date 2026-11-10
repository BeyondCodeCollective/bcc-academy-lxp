"use server";

import { revalidatePath } from "next/cache";
import { requireManager, allowedTrackSlugsForActor } from "../actions-shared";
import { questionErrors } from "@/lib/application-questions";
import {
  getOnboardingChecklist,
  loadOnboardingChecklist,
  customFormSurveyType,
  type ChecklistConfig,
  type ChecklistItem,
} from "@/lib/onboarding/checklists";
import type { SurveyQuestion } from "@/components/survey-fields";

export type ChecklistItemInput = {
  id: string;
  kind: "survey" | "agreement" | "form";
  label: string;
  description: string;
  /** Built-in survey steps only; ignored for the other kinds. */
  surveyType: string;
  /** Custom form steps only. */
  questions: SurveyQuestion[];
};

export type ChecklistInput = {
  title: string;
  intro: string;
  eyebrow: string;
  footnote: string;
  completeTitle: string;
  cohort: string;
  /** Paused: the checklist exists but no longer holds learners. */
  paused: boolean;
  timeCommitment: string;
  requireReleases: boolean;
  items: ChecklistItemInput[];
};

const ITEM_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_ITEMS = 12;

async function actorForTrack(trackSlug: string) {
  const actor = await requireManager();
  const allowed = await allowedTrackSlugsForActor(actor, actor.svc);
  if (allowed && !allowed.has(trackSlug)) throw new Error("Not authorized for this course");
  return actor;
}

/** Save a course's checklist. It replaces the built-in one for that course
 *  until reset. An active checklist holds enrolled learners the moment it is
 *  saved, so the editor starts a new one paused and it is switched on on purpose. */
export async function saveOnboardingChecklistAction(
  trackSlug: string,
  input: ChecklistInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await actorForTrack(trackSlug);
  const { svc } = actor;

  if (!input.title.trim()) return { ok: false, error: "The checklist needs a title." };
  if (input.items.length === 0) return { ok: false, error: "Add at least one step." };
  if (input.items.length > MAX_ITEMS) return { ok: false, error: `A checklist can have at most ${MAX_ITEMS} steps.` };

  const current = await loadOnboardingChecklist(svc, trackSlug);
  const defaults = getOnboardingChecklist(trackSlug);
  // Built-in survey steps can only be ones this course already uses (or the
  // platform intake): an admin can keep or drop them, not invent survey types.
  const allowedSurveys = new Set<string>(["bcc-learner-intake"]);
  for (const c of [defaults, current]) {
    for (const i of c?.items ?? []) if (i.kind === "survey") allowedSurveys.add(i.surveyType);
  }
  const currentAgreement = current?.items.find((i) => i.kind === "agreement");

  const ids = new Set<string>();
  const items: ChecklistItem[] = [];
  let agreementCount = 0;
  for (const it of input.items) {
    if (!ITEM_ID.test(it.id) || ids.has(it.id)) return { ok: false, error: "Duplicate or invalid step ids. Reload and try again." };
    ids.add(it.id);
    const label = it.label.trim();
    if (!label) return { ok: false, error: "Every step needs a name." };
    const base = { id: it.id, label, description: it.description.trim() };

    if (it.kind === "survey") {
      if (!allowedSurveys.has(it.surveyType)) return { ok: false, error: `"${label}" isn't a form this course can use.` };
      items.push({ ...base, kind: "survey", surveyType: it.surveyType, href: `/dashboard/survey/${it.surveyType}` });
    } else if (it.kind === "agreement") {
      agreementCount += 1;
      items.push({
        ...base,
        kind: "agreement",
        surveyType: currentAgreement?.surveyType ?? `${trackSlug}-agreement`,
      });
    } else {
      const qError = questionErrors(it.questions);
      if (qError) return { ok: false, error: `"${label}": ${qError}` };
      items.push({
        ...base,
        kind: "form",
        surveyType: customFormSurveyType(trackSlug, it.id),
        questions: it.questions,
      });
    }
  }
  if (agreementCount > 1) return { ok: false, error: "A checklist can have only one participation agreement." };
  if (agreementCount === 1 && !input.timeCommitment.trim()) {
    return { ok: false, error: "Describe the time commitment for the participation agreement." };
  }

  const keep = current?.agreement;
  const config: ChecklistConfig = {
    cohort: input.cohort.trim() || trackSlug,
    title: input.title.trim(),
    intro: input.intro.trim(),
    eyebrow: input.eyebrow.trim() || undefined,
    footnote: input.footnote.trim() || undefined,
    completeTitle: input.completeTitle.trim() || undefined,
    paused: input.paused,
    agreement: {
      version: keep?.version ?? `${trackSlug}-v1`,
      timeCommitment: input.timeCommitment.trim(),
      requireReleases: input.requireReleases || undefined,
    },
    items,
  };

  // The owning program: the admin's own, or for a super admin the course's.
  let programId: string | null = actor.programId ?? null;
  if (!programId) {
    const { data } = await svc
      .from("track_overrides")
      .select("program_id")
      .eq("track_slug", trackSlug)
      .limit(1)
      .maybeSingle<{ program_id: string | null }>();
    programId = data?.program_id ?? null;
  }

  const { error } = await svc.from("onboarding_checklists").upsert(
    { track_slug: trackSlug, program_id: programId, config, updated_at: new Date().toISOString() },
    { onConflict: "track_slug" },
  );
  if (error) {
    console.error("[saveOnboardingChecklistAction] failed:", error);
    return { ok: false, error: "Could not save the checklist. Please try again." };
  }

  revalidatePath(`/dashboard/admin/onboarding/${trackSlug}`);
  revalidatePath(`/dashboard/track/${trackSlug}`);
  revalidatePath("/dashboard/admin/agreements");
  return { ok: true };
}

/** Drop the saved checklist so the course goes back to its built-in one (or none). */
export async function resetOnboardingChecklistAction(
  trackSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { svc } = await actorForTrack(trackSlug);
  const { error } = await svc.from("onboarding_checklists").delete().eq("track_slug", trackSlug);
  if (error) {
    console.error("[resetOnboardingChecklistAction] failed:", error);
    return { ok: false, error: "Could not reset the checklist. Please try again." };
  }
  revalidatePath(`/dashboard/admin/onboarding/${trackSlug}`);
  revalidatePath(`/dashboard/track/${trackSlug}`);
  revalidatePath("/dashboard/admin/agreements");
  return { ok: true };
}
