import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  Clock,
  ChalkboardTeacher,
  Lightning,
  ArrowRight,
  Medal,
} from "@phosphor-icons/react/dist/ssr";
import { resolveCurrentUnit } from "@/lib/utils";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { WeekCarousel, type WeekCardData } from "@/components/week-carousel";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui";
import { getTrackProgressMap } from "@/app/dashboard/track/actions";
import { addDays } from "@/lib/ical";
import type { OfficeHour, ScheduleItemType } from "@/lib/programs/types";

const SCHEDULE_TYPE_LABEL: Record<ScheduleItemType, string> = {
  "office-hours": "Office Hours",
  mass: "MASS",
  speaker: "Guest Speaker",
  event: "Event",
};
import { getAllSessionContent } from "@/app/dashboard/admin/actions-tracks";
import { isSequentialGated, highestUnlockedWeek } from "@/lib/track-gating";
import { buildGoogleCalendarUrl } from "@/lib/gcal";
import { MyProgressCard } from "@/components/my-progress-card";
import { getLearnerProgress } from "@/lib/learner-progress";
import { HoldingView } from "@/components/holding-view";
import { getLandingHeroForTrack } from "@/lib/landing-pages";
import { getOnboardingChecklist, getOnboardingStatus } from "@/lib/onboarding/checklists";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export const dynamic = "force-dynamic";

export default async function TrackOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveTrackProgram(slug);
  if (!resolved) redirect("/dashboard");
  const { program, track } = resolved;

  const ctx = await getSessionContext();
  const isAdminViewer = canAccessAdminPanel(ctx?.student?.role ?? "");

  // Enrollment gate: a non-admin learner can only open a track they're enrolled
  // in — no viewing another course's curriculum by typing the URL. (Pending
  // registrants are already confined to their own holding page by the layout;
  // this additionally stops ACTIVE learners from reaching other started tracks.)
  if (!isAdminViewer && ctx?.userId) {
    const { data: enr } = await createServiceClient()
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", ctx.userId)
      .eq("track_slug", slug)
      .maybeSingle();
    if (!enr) redirect("/dashboard");
  }

  // Acceptance checklist gate: on a checklist-gated track (e.g. the Cybersecurity
  // cohort), an accepted learner must complete their acceptance materials —
  // Intake Form, Participation Agreement, Pre-Survey — before reaching the
  // course. Start-date independent; admins/previewers bypass. Items a learner
  // already completed (read from survey_responses) auto-check.
  const checklist = getOnboardingChecklist(slug);
  if (checklist && !isAdminViewer && ctx?.userId) {
    const status = await getOnboardingStatus(createServiceClient(), ctx.userId, slug);
    if (status) {
      const studentName = [ctx.student?.first_name, ctx.student?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const itemViews = checklist.items.map((it) => ({
        id: it.id,
        label: it.label,
        description: it.description,
        kind: it.kind,
        href: it.href,
        completed: status.items.find((s) => s.id === it.id)?.completed ?? false,
      }));
      return (
        <OnboardingChecklist
          title={checklist.title}
          intro={checklist.intro}
          items={itemViews}
          allComplete={status.allComplete}
          trackSlug={slug}
          programSlug={program.slug}
          cohort={checklist.cohort}
          defaultName={studentName || undefined}
        />
      );
    }
  }

  // Archived gate: non-admin students cannot view archived builder-created courses.
  if (!isAdminViewer) {
    const svc = createServiceClient();
    const { data: programRow } = await svc
      .from("programs")
      .select("id")
      .eq("slug", program.slug)
      .maybeSingle<{ id: string }>();
    if (programRow) {
      const { data: overrideRow } = await svc
        .from("track_overrides")
        .select("archived_at")
        .eq("program_id", programRow.id)
        .eq("track_slug", slug)
        .maybeSingle<{ archived_at: string | null }>();
      if (overrideRow?.archived_at) {
        return (
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16 text-center space-y-3">
            <Archive size={40} className="mx-auto text-ink-faint" aria-hidden />
            <h1 className="text-xl font-bold text-ink">This course has ended</h1>
            <p className="text-sm text-ink-soft">
              {track.name} is no longer active. Reach out to your instructor if you have questions.
            </p>
          </div>
        );
      }
    }
  }

  const now = new Date();
  const started = !track.startDateTbd && now >= new Date(track.startDate);

  // Certificate of completion — issued by an admin when the student finishes.
  // Checked before the holding gate: a completed student is DONE with the
  // course, so a "hasn't started yet" countdown makes no sense for them —
  // they land on the overview with their certificate card instead.
  let certificateId: string | null = null;
  if (!isAdminViewer && ctx?.userId) {
    const { data: completion } = await createServiceClient()
      .from("track_completions")
      .select("certificate_id")
      .eq("student_id", ctx.userId)
      .eq("track_slug", slug)
      .maybeSingle();
    certificateId = (completion?.certificate_id as string | null) ?? null;
  }

  // Holding page + curriculum lock. Before launch, a registered student sees a
  // confirmation + countdown — not the lessons. Registration earns a seat, not
  // the curriculum. Admins/previewers bypass so they can build ahead of launch.
  // Runs BEFORE the single-event redirect so a not-yet-started single-event
  // track shows the holding view here instead of bouncing to its session page.
  if (!isAdminViewer && !started && !certificateId) {
    const landingHero = await getLandingHeroForTrack(slug).catch(() => null);
    return (
      <HoldingView
        track={track}
        heroImageUrl={landingHero?.heroImageUrl}
        accent={landingHero?.accent}
      />
    );
  }

  // Single-event tracks don't have weeks to scrub — send them straight to
  // the session page (same destination the dashboard card used to use).
  if (track.type === "single-event") {
    redirect(`/dashboard/track/${slug}/1`);
  }

  // Day-gated camps advance by `comingSoonUntil` unlock date, not the 7-day
  // cycle. Shared with the redirect landing path + the classroom page so all
  // three always agree on which Day is current.
  const currentWeek = resolveCurrentUnit(track, now);

  const ctaWeek = started ? currentWeek : 1;
  // Per-track unit label ("Week" default, "Day" for a bootcamp, …).
  const unit = track.unitLabel || "Week";
  const unitLower = unit.toLowerCase();
  // Single "Week N" — the old "Open current week — Week N" said "week" twice.
  const ctaLabel = `Open ${unit} ${ctaWeek}`;

  // Track-level description if authored, else fall back to week 1's
  // description (every track has one written and it's already framing copy).
  const overviewCopy = track.description ?? track.weeks[0]?.description ?? "";

  // Sequential gating (opt-in, self-paced only) reads the student's per-week
  // progress. Admins preview the whole track, so they're never gated. Only
  // query progress when gating is actually active.
  const gated = !isAdminViewer && started && isSequentialGated(track);
  const progress = gated
    ? await getTrackProgressMap(slug).catch(() => ({ watched: [], submitted: [] }))
    : { watched: [], submitted: [] };
  const watchedSet = new Set(progress.watched);
  const submittedSet = new Set(progress.submitted);
  const unlockedThrough = gated
    ? highestUnlockedWeek(track, watchedSet, submittedSet)
    : track.totalWeeks;

  // DB session-content titles are the source of truth: an admin-edited week
  // title overrides the hardcoded config topic here too, so nothing leaks
  // through from the TS config once it's been edited in the admin panel.
  const sessionOverrides = await getAllSessionContent(slug).catch(() => []);
  const titleByWeek = new Map<number, string>();
  for (const row of sessionOverrides) {
    if (row.title) titleByWeek.set(row.week_number, row.title);
  }

  const weekCards: WeekCardData[] = track.weekSummaries.map((ws) => {
    const isCurrent = started && ws.week === currentWeek;
    const isPast = started && ws.week < currentWeek;
    const weekConfig = track.weeks.find((w) => w.week === ws.week);
    const comingSoonUntil = weekConfig?.comingSoonUntil;
    // Admins bypass (mirrors the week page guard) so instructors can prep
    // future sessions from the overview too.
    const comingSoonLocked =
      !isAdminViewer && !!comingSoonUntil && now < new Date(comingSoonUntil);
    const sequentialLocked = gated && ws.week > unlockedThrough;
    const isLocked = comingSoonLocked || sequentialLocked;
    const lockedLabel = comingSoonLocked ? "Coming soon" : sequentialLocked ? "Locked" : null;
    return {
      week: ws.week,
      topic: titleByWeek.get(ws.week) ?? ws.topic,
      icon: ws.icon,
      href: isLocked ? null : `/dashboard/track/${slug}/${ws.week}`,
      isCurrent,
      isPast,
      isLocked,
      lockedLabel,
    };
  });

  // Self-paced courses have no fixed weekly schedule, so a ticking "Week N of M"
  // is misleading — show "Self-paced · N weeks" instead. Otherwise lead with the
  // live week (once started) then the track length.
  const eyebrow = track.selfPaced
    ? `Self-paced · ${track.totalWeeks} ${unitLower}s`
    : started
      ? `${unit} ${currentWeek} of ${track.totalWeeks} · ${track.totalWeeks}-${unitLower} track`
      : `${track.totalWeeks}-${unitLower} track`;

  // Engagement card for actual learners — single-course students land here
  // instead of the dashboard home, so this is where their streak lives. Scoped
  // to this course; admins/previewers don't get it (it'd show their own data).
  const learnerProgress =
    !isAdminViewer && ctx?.userId
      ? await getLearnerProgress(ctx.userId, [slug], now).catch(() => null)
      : null;

  // ── Schedule agenda ───────────────────────────────────────────────────────
  // One chronological feed of everything on this track: the weekly sessions
  // dated from the syllabus (start date + N weeks — same math as the
  // subscribable calendar feed) plus any office-hours / MASS / guest-speaker /
  // event items an admin has added. Sessions only appear once the track has a
  // real (non-TBD) start date. Grouped by calendar month for scanning.
  type AgendaEntry =
    | { kind: "session"; date: string; week: number; title: string }
    | { kind: "item"; date: string; item: OfficeHour };

  const agenda: AgendaEntry[] = [
    ...(!track.startDateTbd && track.startDate
      ? track.weekSummaries.map(
          (ws): AgendaEntry => ({
            kind: "session",
            date: addDays(track.startDate, (ws.week - 1) * 7),
            week: ws.week,
            title: titleByWeek.get(ws.week) ?? ws.topic,
          }),
        )
      : []),
    ...(track.officeHours ?? []).map(
      (item): AgendaEntry => ({ kind: "item", date: item.date, item }),
    ),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const agendaMonths: { key: string; label: string; entries: AgendaEntry[] }[] = [];
  for (const entry of agenda) {
    const key = entry.date.slice(0, 7);
    let group = agendaMonths.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        label: new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        entries: [],
      };
      agendaMonths.push(group);
    }
    group.entries.push(entry);
  }
  const todayISO = now.toISOString().slice(0, 10);
  const sessionTime =
    track.sessionTimes?.[0] && track.sessionTimes[0] !== "Self-paced"
      ? track.sessionTimes[0]
      : "";

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8">
      {isAdminViewer && (
        <div className="flex justify-end">
          <CopyInviteLink
            programSlug={program.slug}
            trackSlug={slug}
            fallbackDomain={program.domain}
          />
        </div>
      )}

      {/* Certificate earned — links the public, shareable certificate page. */}
      {certificateId && (
        <a
          href={`/certificate/${certificateId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 panel p-4 sm:p-5 transition-colors hover:border-ink-faint"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
            <Medal size={22} weight="fill" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">
              You earned your Certificate of Completion! 🎉
            </span>
            <span className="block text-xs text-ink-soft">
              View, print, or share your official certificate — the link works anywhere,
              no login needed.
            </span>
          </span>
          <ArrowRight
            size={16}
            className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </a>
      )}

      {/* Hero — the tone-tinted block frames a 2×5 grid of weekly topics, so
         it doubles as the curriculum-at-a-glance and as week-level navigation.
         Each cell links to its week page; current week is inset-ringed in the
         track tone. Replaces a previous decorative-icon hero. */}
      <header className="space-y-5">
        <div className="relative w-full overflow-hidden panel p-5 sm:p-7">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Jump to any {unitLower}
          </p>
          <WeekCarousel weeks={weekCards} emojiIcons={track.emojiIcons} unitLabel={unit} />
          {started && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1.5 rounded-full panel px-2.5 py-1 text-[11px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-highlight animate-pulse" />
                In progress
              </span>
            </div>
          )}
        </div>

        <div>
          <PageHeader
            eyebrow={eyebrow}
            title={track.name}
          />
          {overviewCopy && (
            <p className="mt-3 text-base leading-relaxed text-ink-soft whitespace-pre-wrap">
              {overviewCopy}
            </p>
          )}
        </div>

        <div>
          <Link
            href={`/dashboard/track/${slug}/${ctaWeek}`}
            className={`${buttonClass("primary", "md")} w-full justify-center text-[15px] shadow-sm sm:w-auto`}
          >
            {ctaLabel}
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </header>

      {learnerProgress && <MyProgressCard {...learnerProgress} />}

      {/* Quick facts strip — mirrors workshop detail. Self-paced tracks
         skip the start-date card (it reads as stale once a self-paced
         program is live) and the grid drops to 3 columns. */}
      <dl
        className="grid grid-cols-3 gap-3"
      >
        <Fact
          icon={ChalkboardTeacher}
          label="Instructor"
          value={track.instructor}
        />
        <Fact
          icon={Clock}
          label="Duration"
          value={`${track.totalWeeks} ${unitLower}s`}
        />
        <Fact
          icon={Lightning}
          label="Cadence"
          value={
            unitLower === "day"
              ? "Daily"
              : track.sessionsPerWeek > 1
                ? `${track.sessionsPerWeek}×/week`
                : "1×/week"
          }
        />
      </dl>

      {agendaMonths.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Schedule
          </h2>
          <div className="space-y-6">
            {agendaMonths.map((month) => (
              <div key={month.key} className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {month.label}
                </h3>
                <ul className="divide-y divide-rule overflow-hidden panel">
                  {month.entries.map((entry) => {
                    const d = new Date(`${entry.date}T12:00:00`);
                    const day = d.getDate();
                    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
                    const isPast = entry.date < todayISO;
                    return (
                      <li
                        key={
                          entry.kind === "session"
                            ? `s-${entry.week}`
                            : `i-${entry.date}-${entry.item.title}`
                        }
                        className={`flex gap-4 px-4 py-3.5 ${isPast ? "opacity-60" : ""}`}
                      >
                        <div className="w-9 shrink-0 text-center leading-tight">
                          <div className="text-lg font-bold tabular-nums text-ink">{day}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                            {weekday}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          {entry.kind === "session" ? (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="inline-flex items-center rounded-full bg-paper-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                                Session
                              </span>
                              <a
                                href={`/dashboard/track/${slug}/${entry.week}`}
                                className="text-sm font-semibold text-ink hover:underline"
                              >
                                {entry.title}
                              </a>
                              {sessionTime && (
                                <span className="text-xs text-ink-soft">{sessionTime}</span>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="inline-flex items-center rounded-full bg-paper-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                                  {SCHEDULE_TYPE_LABEL[entry.item.type ?? "office-hours"]}
                                </span>
                                <p className="text-sm font-semibold text-ink">{entry.item.title}</p>
                                {entry.item.time && (
                                  <span className="text-xs text-ink-soft">{entry.item.time}</span>
                                )}
                              </div>
                              {entry.item.description && (
                                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                                  {entry.item.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                {entry.item.joinUrl && (
                                  <a
                                    href={entry.item.joinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonClass("dark", "sm")}
                                  >
                                    Join the call →
                                  </a>
                                )}
                                <a
                                  href={buildGoogleCalendarUrl({
                                    title: entry.item.title,
                                    date: entry.item.date,
                                    details: [
                                      entry.item.time,
                                      entry.item.description,
                                      entry.item.dialIn ? `Dial-in: ${entry.item.dialIn}` : "",
                                    ]
                                      .filter(Boolean)
                                      .join("\n\n"),
                                    location: entry.item.joinUrl,
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={buttonClass("secondary", "sm")}
                                >
                                  Add to Google Calendar
                                </a>
                                {entry.item.dialIn && (
                                  <span className="text-xs text-ink-soft">
                                    Or dial: {entry.item.dialIn}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
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
