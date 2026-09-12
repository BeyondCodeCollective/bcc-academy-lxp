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
import { trackHasStarted } from "@/lib/utils";
import { isSequentialGated, highestUnlockedWeek } from "@/lib/track-gating";
import { getTrackProgressMap } from "@/app/dashboard/track/actions";
import { SessionStage } from "@/components/fde/session-stage";
import { RULEBOOK_PROMPT_TEXTS } from "@/components/fde/rulebook-prompts";
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

  // Same gates as the week page: a staged session is still a track week, and
  // direct navigation here must not bypass the launch date, the coming-soon
  // date, or sequential unlock.
  const { track } = resolved;
  if (!isStaff) {
    if (!trackHasStarted(track)) redirect(`/dashboard/track/${trackSlug}`);

    const weekContent = track.weeks.find((w) => w.week === weekNum);
    if (weekContent?.comingSoonUntil && new Date() < new Date(weekContent.comingSoonUntil)) {
      redirect(`/dashboard/track/${trackSlug}/${weekNum}`);
    }

    if (isSequentialGated(track) && ctx?.userId) {
      const progressMap = await getTrackProgressMap(trackSlug).catch(() => null);
      if (progressMap) {
        const unlockedThrough = highestUnlockedWeek(
          track,
          new Set(progressMap.watched),
          new Set(progressMap.submitted),
        );
        if (weekNum > unlockedThrough) {
          redirect(`/dashboard/track/${trackSlug}/${weekNum}`);
        }
      }
    }
  }

  // Someone who already answered any of the three rulebook prompts sees
  // those answers again, not blank boxes. Each prompt's own text is the
  // storage key (see RULEBOOK_PROMPT_TEXTS) — a copy that drifted here would
  // silently write an answer somewhere the reflection view never looks.
  const existing = await getReflection(trackSlug, weekNum).catch(() => null);
  const responses = (existing?.responses && typeof existing.responses === "object"
    ? (existing.responses as Record<string, string>)
    : {});
  const savedAnswers = Object.fromEntries(
    RULEBOOK_PROMPT_TEXTS.map((prompt) => [prompt, responses[prompt] ?? ""]),
  );

  return (
    <div style={{ position: "relative" }}>
      <SessionStage
        trackSlug={trackSlug}
        weekNumber={weekNum}
        savedAnswers={savedAnswers}
        firstName={ctx?.student?.first_name?.trim() || null}
      />
      {/* The way out.
         The stage hides the sidebar and the top bar, so this is the only
         chrome on the page — which makes it the only exit. The first version
         was 12px grey on cream in a corner and read as decoration; a learner
         who cannot see how to leave is stuck in a session, which is a worse
         failure than an ugly button. Escape works too. */}
      <Link
        href={`/dashboard/track/${trackSlug}/${weekNum}`}
        aria-label="Leave the session and go back to the session page"
        style={{
          position: "fixed",
          top: 18,
          right: 20,
          zIndex: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 13,
          fontWeight: 500,
          color: "#4A463F",
          textDecoration: "none",
          padding: "9px 15px 9px 12px",
          borderRadius: 99,
          background: "#ffffff",
          border: "1px solid #EDE7DD",
          boxShadow: "0 2px 8px rgba(90,70,45,.08)",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6E6A63" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
        Leave session
      </Link>
    </div>
  );
}
