import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { getHomeProgramForTrack } from "@/lib/programs";
import type { MvpScheduleInput } from "./schedule";
import type { MvpSessionDelivery } from "./course-performance";

const overrideColumns = "id, start_date, total_weeks, sessions_per_week, unit_label, last_session_day_offset, week_summaries, self_paced";

type Db = ReturnType<typeof createServiceClient>;

async function loadOverride(db: Db, programId: string, courseSlug: string) {
  const { data, error } = await db.from("track_overrides").select(overrideColumns)
    .eq("program_id", programId).eq("track_slug", courseSlug).order("id").limit(2);
  if (error || !Array.isArray(data)) throw new Error("Unable to verify course session schedule.");
  if (!data.length) return null;
  // Check the next cursor even when the server caps a response at one row.
  const first = data[0];
  if (typeof first.id !== "string" || !first.id) throw new Error("Invalid course session schedule.");
  const next = await db.from("track_overrides").select("id")
    .eq("program_id", programId).eq("track_slug", courseSlug).gt("id", first.id).order("id").limit(1);
  if (next.error || !Array.isArray(next.data)) throw new Error("Unable to verify course session schedule.");
  if (data.length > 1 || next.data.length) throw new Error("Ambiguous course session schedule.");
  return first;
}

async function loadDelivery(db: Db, ownerId: string, courseSlug: string) {
  const delivery: MvpSessionDelivery[] = [];
  let cursor: string | null = null;
  while (true) {
    let query = db.from("session_content").select("id, week_number, status, status_2, status_3")
      .eq("program_id", ownerId).eq("track", courseSlug).order("id").limit(500);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) throw new Error("Unable to verify delivered course sessions.");
    if (!data.length) break;
    const next: unknown = data[data.length - 1].id;
    if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Course session pagination did not advance.");
    delivery.push(...data);
    cursor = next;
  }
  return delivery;
}

// Request-local, server-only metadata loader. Callers must authorize the selected
// program/course before calling. Canonical-owner reads expose schedule metadata
// only; they never widen the authorized learner roster or activity scope.
// DB-only courses remain scoped to the selected program; do not guess ownership
// by searching other programs. Missing configuration stays unavailable.
export function createMvpScheduleLoader(db: Db) {
  const deliveryByCourse = new Map<string, Promise<MvpSessionDelivery[]>>();
  return async function loadMvpSchedule(programId: string, courseSlug: string) {
    const home = getHomeProgramForTrack(courseSlug);
    const base = home?.tracks.find(track => track.slug === courseSlug);
    let ownerId = programId;
    if (home) {
      const owner = await db.from("programs").select("id").eq("slug", home.slug).single();
      if (owner.error || !owner.data || typeof owner.data.id !== "string") throw new Error("Unable to resolve course schedule ownership.");
      ownerId = owner.data.id;
    }
    let override = await loadOverride(db, ownerId, courseSlug);
    if (!override && ownerId !== programId) {
      override = await loadOverride(db, programId, courseSlug);
      if (override) ownerId = programId;
    }
    const startDate = override?.start_date ?? base?.startDate;
    const totalWeeks = override?.total_weeks ?? base?.totalWeeks;
    const sessionsPerWeek = override?.sessions_per_week ?? base?.sessionsPerWeek;
    // Builder courses leave the offset unset; the platform reads that as 0 (programs/server.ts).
    const lastSessionDayOffset = override?.last_session_day_offset ?? base?.lastSessionDayOffset ?? 0;
    const track: MvpScheduleInput["track"] = startDate && totalWeeks != null && sessionsPerWeek != null && lastSessionDayOffset != null ? {
      slug: courseSlug, name: courseSlug, shortName: courseSlug, startDate, totalWeeks, sessionsPerWeek, lastSessionDayOffset,
      startDateTbd: override?.start_date ? false : base?.startDateTbd,
      unitLabel: override?.unit_label ?? base?.unitLabel,
      weekSummaries: override?.week_summaries ?? base?.weekSummaries ?? [],
      selfPaced: override?.self_paced ?? base?.selfPaced,
    } : null;
    return {
      track,
      ownerId,
      delivery: () => {
        const key = JSON.stringify([ownerId, courseSlug]);
        let pending = deliveryByCourse.get(key);
        if (!pending) {
          pending = loadDelivery(db, ownerId, courseSlug);
          deliveryByCourse.set(key, pending);
        }
        return pending;
      },
    };
  };
}
