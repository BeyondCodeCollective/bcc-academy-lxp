/**
 * The immersive session surface — FDE 101's "Where AI Belongs" as the learner
 * meets it: cream, one column, cobalt, no dashboard chrome.
 *
 * Full-bleed on purpose. Seven people open this on their own laptops while the
 * facilitator walks the room, so everything that frames a normal week page
 * (sidebar, schedule, breadcrumbs) would only compete with the thing itself.
 *
 * Gating mirrors the week page: enrolled learner or staff, nobody else.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { canAccessAdminPanel } from "@/lib/roles";
import { SessionStage } from "@/components/fde/session-stage";
import { getReflection } from "@/app/dashboard/track/actions";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ slug: string; week: string }>;
}) {
  const { slug: trackSlug, week: weekStr } = await params;
  const weekNum = parseInt(weekStr, 10);

  const [resolved, ctx] = await Promise.all([
    resolveTrackProgram(trackSlug),
    getSessionContext(),
  ]);
  if (!resolved) redirect("/dashboard");
  if (!resolved.track.weeks.find((w) => w.week === weekNum)) redirect("/dashboard");

  const isStaff = canAccessAdminPanel(ctx?.student?.role ?? "");
  if (!isStaff && ctx?.userId) {
    const { data: enr } = await createServiceClient()
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", ctx.userId)
      .eq("track_slug", trackSlug)
      .maybeSingle();
    if (!enr) redirect("/dashboard");
  }

  // The prompt text doubles as the storage key for the answer, so read it
  // from the track rather than restating it here — a copy that drifts would
  // silently write the sentence somewhere the reflection view never looks.
  const prompt =
    resolved.track.weeks.find((w) => w.week === weekNum)?.reflectionPrompts?.[0] ??
    resolved.track.defaultReflectionPrompts?.[0] ??
    "The call I make in about four seconds that would take someone new an hour to get wrong is…";

  // Someone who already wrote their sentence sees it again, not a blank box.
  const existing = await getReflection(trackSlug, weekNum).catch(() => null);
  const saved =
    existing?.responses && typeof existing.responses === "object"
      ? String((existing.responses as Record<string, string>)[prompt] ?? "")
      : "";

  return (
    <div style={{ position: "relative" }}>
      <SessionStage
        trackSlug={trackSlug}
        weekNumber={weekNum}
        prompt={prompt}
        savedSentence={saved}
        firstName={ctx?.student?.first_name?.trim() || null}
      />
      {/* The one piece of chrome: a way back that never competes with the stage. */}
      <Link
        href={`/dashboard/track/${trackSlug}/${weekNum}`}
        style={{
          position: "fixed",
          top: 16,
          right: 18,
          zIndex: 10,
          fontSize: 12,
          color: "#A39D93",
          textDecoration: "none",
          padding: "6px 12px",
          borderRadius: 99,
          background: "rgba(255,255,255,.7)",
          backdropFilter: "blur(6px)",
        }}
      >
        Close
      </Link>
    </div>
  );
}
