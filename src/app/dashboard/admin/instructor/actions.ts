"use server";

import { revalidatePath } from "next/cache";
import { requireCapability, logAdminAccess } from "../actions-shared";
import { HUMAN_CHECKPOINTS } from "@/lib/instructor/prompt";

// The facilitator's side of instructor mode: resolve a flag the AI filed, or
// pass a checkpoint only a human may pass. Both write rows the instructor reads
// on its next turn, so a sign-off here changes what the learner hears next.
//
// Gated on facilitate_cohort, not manage_students: these writes touch flags and
// checkpoints, never the roster, and the people who run sessions hold the
// instructor role.

const PATH = "/dashboard/admin/instructor";
const CHECKPOINT_KEYS = new Set(HUMAN_CHECKPOINTS.map((c) => c.key));

export async function resolveFlagAction(flagId: string, note: string): Promise<{ ok: boolean; error?: string }> {
  const { svc, userId, programId } = await requireCapability("facilitate_cohort");
  const { error } = await svc
    .from("instructor_flags")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolution_note: note.trim().slice(0, 1000) || null,
    })
    .eq("id", flagId)
    .eq("status", "open");
  if (error) return { ok: false, error: error.message };
  logAdminAccess(svc, { actorUserId: userId, programId, action: "view", resource: "instructor_flags.resolve", rowCount: 1 });
  revalidatePath(PATH);
  return { ok: true };
}

export async function approveCheckpointAction(args: {
  studentId: string;
  programId: string;
  trackSlug: string;
  key: string;
  note?: string;
  score?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { svc, userId } = await requireCapability("facilitate_cohort");
  if (!CHECKPOINT_KEYS.has(args.key)) return { ok: false, error: "Unknown checkpoint." };
  const score =
    args.key === "capstone_scored" && typeof args.score === "number" && Number.isInteger(args.score)
      ? Math.max(0, Math.min(27, args.score))
      : null;
  const { error } = await svc.from("human_checkpoints").upsert(
    {
      student_id: args.studentId,
      program_id: args.programId,
      track_slug: args.trackSlug,
      checkpoint_key: args.key,
      approved_by: userId,
      approved_at: new Date().toISOString(),
      note: args.note?.trim().slice(0, 1000) || null,
      score,
    },
    { onConflict: "student_id,track_slug,checkpoint_key" },
  );
  if (error) return { ok: false, error: error.message };
  logAdminAccess(svc, {
    actorUserId: userId,
    programId: args.programId,
    action: "view",
    resource: `human_checkpoints.${args.key}`,
    rowCount: 1,
  });
  revalidatePath(PATH);
  return { ok: true };
}

export async function revokeCheckpointAction(args: {
  studentId: string;
  trackSlug: string;
  key: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { svc } = await requireCapability("facilitate_cohort");
  const { error } = await svc
    .from("human_checkpoints")
    .delete()
    .eq("student_id", args.studentId)
    .eq("track_slug", args.trackSlug)
    .eq("checkpoint_key", args.key);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}
