import { easternToUtc, easternDayKey, COHORT_TIME_ZONE } from "@/lib/utils";

/**
 * The minimum a track has to have for the band to schedule it. Structural on
 * purpose: the admin surface carries its own narrower track type, and both it
 * and the learner's TrackConfig satisfy this.
 */
export type BandTrack = {
  slug: string;
  name: string;
  shortName?: string;
  unitLabel?: string;
  weekSummaries?: {
    week: number;
    date?: string;
    label?: string;
    time?: string;
    durationMinutes?: number;
  }[];
};

/**
 * The home band's data — the sentence, the week rail, the counts.
 *
 * Pure on purpose: the whole point of the band is that it answers "what's
 * going on" correctly, and "correctly" here means timezone-correct across a
 * DST boundary and honest when a cohort has no schedule. That is worth tests,
 * and tests need this to take `now` rather than read the clock.
 *
 * Every session time in the platform is an Eastern wall clock (COHORT_TIME_ZONE)
 * carried as `weekSummaries[].date` + `.time`, so all of this funnels through
 * easternToUtc rather than doing offset arithmetic by hand.
 */

export type ScheduledSession = {
  trackSlug: string;
  /** Short code for the rail chip — "S+", "MW". */
  code: string;
  trackName: string;
  /** Student-facing unit label, e.g. "Session 13" or "Week 6". */
  unitLabel: string;
  /** ISO instant the session starts. */
  startsAt: string;
  /** "6:30 PM ET", already formatted for display. */
  timeLabel: string;
  durationMinutes: number;
};

export type RailDay = {
  /** "Mon" */
  short: string;
  /** "M" — mobile, where a column is 48px wide. */
  initial: string;
  /** Day of month, as displayed. */
  dayOfMonth: string;
  /** YYYY-MM-DD in Eastern. */
  dateKey: string;
  isToday: boolean;
  sessions: ScheduledSession[];
};

/**
 * A track's short code for a rail chip. Prefers an explicit shortName, else
 * initials from the name — "MASS Wraparound" becomes "MW", "CompTIA Security+"
 * becomes "CS". Never longer than four characters, because the chip is 38px.
 */
export function trackCode(track: Pick<BandTrack, "slug" | "shortName" | "name">): string {
  const source = track.shortName?.trim() || track.name?.trim() || track.slug;
  // A short single word is already a code ("MASS", "FDE 101" -> "FDE").
  const words = source.split(/[\s—–·-]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  const initials = words
    .filter((w) => /[A-Za-z0-9]/.test(w[0]))
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  return initials || source.slice(0, 4).toUpperCase();
}

function timeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm} ET`;
}

/**
 * Every scheduled session across the given tracks, in time order. A unit with
 * no `date` is not scheduled and is skipped rather than guessed at — a cohort
 * whose dates aren't filled in should show an empty week, not a fabricated one.
 */
export function scheduledSessions(
  tracks: BandTrack[],
  displayUnit?: (track: BandTrack, week: number) => string,
): ScheduledSession[] {
  const out: ScheduledSession[] = [];
  for (const track of tracks) {
    for (const ws of track.weekSummaries ?? []) {
      if (!ws.date) continue;
      const time = ws.time ?? "18:30";
      out.push({
        trackSlug: track.slug,
        code: trackCode(track),
        trackName: track.shortName || track.name,
        unitLabel:
          displayUnit?.(track, ws.week) ??
          ws.label ??
          `${track.unitLabel ?? "Week"} ${ws.week}`,
        startsAt: easternToUtc(ws.date, time),
        timeLabel: timeLabel(time),
        durationMinutes: ws.durationMinutes ?? 90,
      });
    }
  }
  return out.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/**
 * The next session that hasn't finished yet. A session counts as "now" until
 * its duration is up, so the band says "running now" rather than jumping to
 * next week the moment it starts.
 */
export function nextSession(
  sessions: ScheduledSession[],
  now: Date,
): { session: ScheduledSession; live: boolean } | null {
  const t = now.getTime();
  for (const s of sessions) {
    const start = Date.parse(s.startsAt);
    const end = start + s.durationMinutes * 60_000;
    if (t < end) return { session: s, live: t >= start };
  }
  return null;
}

/** Monday-anchored week containing `now`, in Eastern. */
export function weekRail(sessions: ScheduledSession[], now: Date): RailDay[] {
  const todayKey = easternDayKey(now);
  const [y, m, d] = todayKey.split("-").map(Number);
  // Weekday of today in Eastern, 0 = Sunday.
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const backToMonday = (dow + 6) % 7;

  const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days: RailDay[] = [];
  for (let i = 0; i < 7; i++) {
    const at = new Date(Date.UTC(y, m - 1, d - backToMonday + i));
    const dateKey = at.toISOString().slice(0, 10);
    days.push({
      short: SHORT[i],
      initial: SHORT[i][0],
      dayOfMonth: String(at.getUTCDate()),
      dateKey,
      isToday: dateKey === todayKey,
      sessions: sessions.filter(
        (s) => easternDayKey(new Date(s.startsAt)) === dateKey,
      ),
    });
  }
  return days;
}

/**
 * The sentence. This is the whole reason the band exists — someone opening
 * the product should be able to read one line and know where they stand.
 */
export function bandSentence(
  next: { session: ScheduledSession; live: boolean } | null,
  now: Date,
): { headline: string; sub: string } {
  if (!next) {
    return {
      headline: "Nothing scheduled.",
      sub: "No upcoming sessions on the calendar.",
    };
  }
  const { session, live } = next;
  const sub = `${session.trackName} · ${session.unitLabel} · ${session.timeLabel}`;
  if (live) return { headline: `${session.trackName} is live now.`, sub };

  const startKey = easternDayKey(new Date(session.startsAt));
  const todayKey = easternDayKey(now);
  if (startKey === todayKey) {
    return { headline: `${session.trackName} runs today.`, sub };
  }

  const dayMs = 86_400_000;
  const diff = Math.round(
    (Date.parse(`${startKey}T12:00:00Z`) - Date.parse(`${todayKey}T12:00:00Z`)) / dayMs,
  );
  if (diff === 1) {
    return { headline: `Nothing runs today.\nNext up is ${session.trackName}, tomorrow.`, sub };
  }
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: COHORT_TIME_ZONE,
    weekday: "long",
  }).format(new Date(session.startsAt));
  if (diff < 7) {
    return { headline: `You're free until ${weekday}.`, sub };
  }
  return { headline: `Nothing this week.\nNext up is ${session.trackName}.`, sub };
}
