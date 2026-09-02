"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  resolveProgramForActor,
} from "@/app/dashboard/admin/actions-shared";
import type { CompletionRule, NudgeRule } from "@/lib/automation/rules";

export type SaveAutomationInput = {
  autoCertificate: boolean;
  completion: CompletionRule;
  nudgesEnabled: boolean;
  nudges: NudgeRule[];
};

export type SaveAutomationResult = { ok: true } | { ok: false; error: string };

export async function saveTrackAutomation(
  programSlug: string,
  trackSlug: string,
  input: SaveAutomationInput,
): Promise<SaveAutomationResult> {
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

  // Re-validate shapes server-side — the row drives outbound email.
  const lessons =
    input.completion.lessons === "all"
      ? "all"
      : Math.max(1, Math.floor(Number(input.completion.lessons) || 1));
  const completion: CompletionRule = {
    lessons,
    ...(input.completion.submissions
      ? { submissions: Math.max(1, Math.floor(Number(input.completion.submissions))) }
      : {}),
  };
  const nudges: NudgeRule[] = input.nudges
    .filter((n) => n.id === "never-started" || n.id === "stalled")
    .map((n) => ({ id: n.id, afterDays: Math.max(1, Math.floor(Number(n.afterDays) || 7)) }));

  const { error } = await svc.from("track_automation").upsert(
    {
      program_id: programId,
      track_slug: trackSlug,
      auto_certificate: input.autoCertificate,
      completion,
      nudges_enabled: input.nudgesEnabled,
      nudges,
      updated_at: new Date().toISOString(),
      updated_by: actor.userId,
    },
    { onConflict: "program_id,track_slug" },
  );
  if (error) {
    // Most likely cause pre-migration: the table doesn't exist yet.
    return { ok: false, error: error.message };
  }
  revalidatePath(`/dashboard/admin/programs/${trackSlug}/edit`);
  return { ok: true };
}
