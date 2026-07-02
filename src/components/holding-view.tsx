import {
  CalendarCheck,
  ChalkboardTeacher,
  Clock,
  Lightning,
  GoogleLogo,
  CalendarPlus,
} from "@phosphor-icons/react/dist/ssr";
import type { TrackConfig } from "@/lib/programs/types";
import { buildGoogleCalendarUrl } from "@/lib/gcal";
import { LaunchCountdown } from "@/components/launch-countdown";

// In-portal holding page shown to a registered learner before their course
// starts. Echoes the landing page they registered on (hero image + accent) and
// leads with a big countdown. Curriculum stays locked until the start date —
// this is all they see until then.

export function HoldingView({
  track,
  heroImageUrl,
  accent = "#1D59FF",
}: {
  track: TrackConfig;
  heroImageUrl?: string | null;
  accent?: string;
}) {
  const hasDate = !track.startDateTbd && !!track.startDate;
  const startDate = track.startDate;
  const launchLabel = hasDate
    ? new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const calDetails = `Your spot for ${track.name}. We'll see you there!`;
  // Live events carry their exact first-session time (kickoffTimeUtc); the
  // date-derived fallbacks are arbitrary and only acceptable for self-paced.
  const kickoffIso = track.kickoffTimeUtc ?? null;
  const googleCalUrl = hasDate
    ? buildGoogleCalendarUrl({
        title: track.name,
        date: startDate,
        details: calDetails,
        ...(kickoffIso
          ? {
              startUtc: kickoffIso,
              // 1-hour block by convention when the session length is unknown.
              endUtc: new Date(Date.parse(kickoffIso) + 3_600_000).toISOString(),
            }
          : {}),
      })
    : null;
  const icsUrl = hasDate
    ? `/api/calendar/event?` +
      new URLSearchParams({
        title: track.name,
        start: kickoffIso ?? `${startDate}T09:00:00Z`,
        details: calDetails,
      }).toString()
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      {/* Hero banner — echoes the landing page the learner registered on. */}
      <div className="relative overflow-hidden rounded-2xl border border-rule">
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${accent}, #1a1a1a)` }}
          />
        )}
        {/* Legibility scrim */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,26,26,0.25) 0%, rgba(26,26,26,0.55) 55%, rgba(26,26,26,0.88) 100%)",
          }}
        />
        <div className="relative flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[340px] sm:p-8">
          <span
            className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#1a1a1a]"
            style={{ background: "#E5F701" }}
          >
            <CalendarCheck size={13} weight="bold" aria-hidden />
            You&apos;re in
          </span>
          <h1
            className="font-bold leading-[1.02] tracking-tight text-white"
            style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(30px, 5vw, 46px)" }}
          >
            {track.name}
          </h1>
          {launchLabel && (
            <p className="mt-2 text-sm font-medium text-white/85 sm:text-base">
              Your seat is saved · kicks off {launchLabel}
            </p>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div className="panel p-6 sm:p-8">
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          {hasDate ? "Countdown to kickoff" : "Starting soon"}
        </p>
        {hasDate ? (
          <LaunchCountdown
            targetIso={kickoffIso ?? new Date(`${startDate}T12:00:00`).toISOString()}
            accent={accent}
          />
        ) : (
          <p className="text-center text-sm leading-relaxed text-ink-soft">
            We&apos;re finalizing the start date — we&apos;ll email you the moment it&apos;s
            set. Keep an eye on your inbox.
          </p>
        )}
      </div>

      {/* Quick facts — unit-aware: a day-based bootcamp reads "3 days · Daily",
          a weekly track keeps the week/workshop phrasing. */}
      <dl className="grid grid-cols-3 gap-3">
        <Fact icon={ChalkboardTeacher} label="Instructor" value={track.instructor || "TBA"} />
        <Fact
          icon={Clock}
          label="Length"
          value={
            track.totalWeeks === 1
              ? "1 session"
              : `${track.totalWeeks} ${(track.unitLabel || "week").toLowerCase()}s`
          }
        />
        <Fact
          icon={Lightning}
          label="Cadence"
          value={
            (track.unitLabel || "").toLowerCase() === "day"
              ? "Daily"
              : track.sessionsPerWeek > 1
                ? `${track.sessionsPerWeek}×/week`
                : "Workshop"
          }
        />
      </dl>

      {/* What's next + add to calendar */}
      <section className="panel p-6 space-y-4">
        <h2 className="text-base font-bold text-ink">What happens next</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          This is your home base — come back here any time. The moment we kick off, your
          lessons unlock right on this page. We&apos;ll email you a reminder before we start.
        </p>
        {(googleCalUrl || icsUrl) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {googleCalUrl && (
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-rule px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-soft"
              >
                <GoogleLogo size={15} weight="bold" aria-hidden />
                Add to Google Calendar
              </a>
            )}
            {icsUrl && (
              <a
                href={icsUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-rule px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-soft"
              >
                <CalendarPlus size={15} weight="bold" aria-hidden />
                Add to Apple / iCal
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 panel p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        <Icon size={11} weight="bold" aria-hidden />
        {label}
      </p>
      <p className="text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}
