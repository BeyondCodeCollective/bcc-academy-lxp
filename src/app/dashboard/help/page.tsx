import { cookies } from "next/headers";
import { formatCohortDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import { resolveCurrentUser } from "@/lib/current-user";
import { canAccessAdminPanel } from "@/lib/roles";
import { getEnrolledTracks } from "@/lib/enrollment";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getPreviewTrackSlug, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import type { TrackConfig } from "@/lib/programs/types";
import {
  Envelope,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const program = await getProgram();
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");

  const actualIsAdmin = canAccessAdminPanel(currentUser.userRole);
  // Super-admins previewing as a specific track/L&L should see that
  // context's help, not the firehose. For real students, enrollment scopes it.
  const previewSlug = await getPreviewTrackSlug(currentUser.userRole);
  const previewingLunchLearn = previewSlug === LUNCH_LEARN_PREVIEW_SLUG;
  const previewingTrack = previewSlug && !previewingLunchLearn
    ? program.tracks.find((t) => t.slug === previewSlug)
    : null;
  const isAdmin = actualIsAdmin && !previewSlug;

  let visibleTracks: TrackConfig[];
  if (previewingLunchLearn) {
    // L&L context has no tracks — scope out everything track-specific.
    visibleTracks = [];
  } else if (previewingTrack) {
    visibleTracks = [previewingTrack];
  } else if (!isAdmin && !currentUser.isDemo && isSupabaseConfigured()) {
    visibleTracks = program.tracks;
    const ctx = await getSessionContext();
    if (ctx) {
      const supabase = await createClient();
      const enrolled = await getEnrolledTracks(supabase, ctx.userId, program);
      if (enrolled.length > 0) {
        visibleTracks = enrolled;
      }
    }
  } else {
    visibleTracks = program.tracks;
  }

  const weeklyTracks = visibleTracks.filter((t) => t.type === "weekly");
  const cohort = program.defaultCohort;
  const startDate = formatCohortDate(cohort.startDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Build instructor list from track configs — no hardcoded data.
  const instructorSet = new Map<string, { name: string; track: string }>();
  for (const t of visibleTracks) {
    if (t.instructor && t.instructor !== "TBD") {
      if (!instructorSet.has(t.instructor)) {
        instructorSet.set(t.instructor, {
          name: t.instructor,
          track: t.shortName,
        });
      }
    }
  }
  const instructorList = Array.from(instructorSet.values());

  const toc: { id: string; label: string }[] = [
    { id: "welcome", label: "Welcome" },
    { id: "cohort", label: "Your program" },
    ...(weeklyTracks.length > 0
      ? [{ id: "rhythm", label: "Weekly rhythm" }]
      : []),
    { id: "platform", label: "Using the platform" },
    ...(instructorList.length > 0
      ? [{ id: "instructors", label: "Instructors" }]
      : []),
    { id: "sessions", label: "Live sessions" },
    { id: "expectations", label: "What we expect" },
    ...(isAdmin ? [{ id: "instructor-guide", label: "Instructor guide" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-6xl px-4 sm:px-5 py-12 md:py-16">
      <div className="md:grid md:grid-cols-[200px_1fr] md:gap-x-12">
        {/* Sticky TOC */}
        <nav
          aria-label="On this page"
          className="hidden md:block md:sticky md:top-20 md:self-start"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-4">
            On this page
          </p>
          <ul className="space-y-2 border-l border-rule-soft">
            {toc.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="-ml-px block border-l border-transparent pl-3 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <header id="welcome" className="mb-12 md:mb-14 scroll-mt-24">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-3">
              Help
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold text-ink tracking-[-0.02em] leading-[0.95]">
              Welcome to {program.name}
            </h1>
            <p className="mt-5 text-[17px] leading-[1.65] text-ink max-w-2xl tracking-[-0.005em]">
              {program.tagline}. This page is your handbook — orientation, who
              to reach, and how to get unstuck.
            </p>
          </header>

          <div className="space-y-14">
            <Section id="cohort" eyebrow="Your program">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <Fact label="Program" value={program.name} />
                <Fact label="Start date" value={startDate} />
                <Fact label="Length" value={`${cohort.totalWeeks} weeks`} />
                <Fact
                  label="Your tracks"
                  value={visibleTracks.map((t) => t.shortName).join(", ") || "Not enrolled yet"}
                />
              </dl>
            </Section>

            {weeklyTracks.length > 0 && (
              <Section id="rhythm" eyebrow="Weekly rhythm">
                <p className="text-[15px] leading-[1.6] text-ink-soft mb-5">
                  Each week you&apos;ll have live sessions, a short reflection,
                  and (for some tracks) a submission. Recordings post within a
                  day if you miss a session.
                </p>
                <ul className="border-y border-rule">
                  {weeklyTracks.map((t, i) => (
                    <li
                      key={t.slug}
                      className={`grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 px-1 py-3 ${
                        i > 0 ? "border-t border-rule-soft" : ""
                      }`}
                    >
                      <span className="text-[10px] font-mono tabular-nums tracking-tight text-ink-faint px-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[15px] font-medium text-ink truncate">
                        {t.name}
                      </p>
                      <p className="text-[13px] tabular-nums text-ink-soft">
                        {t.sessionTimes.join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section id="platform" eyebrow="Using the platform">
              <ul className="border-y border-rule">
                <PlatformRow
                  title="Home"
                  body="Your weekly view — current week, upcoming sessions, reflections, and any submissions due."
                />
                <PlatformRow
                  title="Help"
                  body="This page. Instructor contacts, session schedule, and how to get unstuck."
                />
                {isAdmin && (
                  <PlatformRow
                    title="Admin"
                    body="Manage curriculum, students, attendance, surveys, and submissions."
                    href="/dashboard/admin"
                  />
                )}
              </ul>
            </Section>

            {instructorList.length > 0 && (
              <Section id="instructors" eyebrow="Your instructors">
                <ul className="border-y border-rule">
                  {instructorList.map((inst, i) => (
                    <li
                      key={inst.name}
                      className={`grid grid-cols-[auto_1fr] items-center gap-x-6 px-1 py-4 ${
                        i > 0 ? "border-t border-rule-soft" : ""
                      }`}
                    >
                      <span className="text-[10px] font-mono tabular-nums tracking-tight text-ink-faint px-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-ink truncate">
                          {inst.name}
                        </p>
                        <p className="text-[12px] text-ink-soft mt-0.5">
                          {inst.track}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section id="sessions" eyebrow="Live sessions">
              <ul className="border-y border-rule">
                {visibleTracks.map((t, i) => (
                  <li
                    key={t.slug}
                    className={`grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 px-1 py-4 ${
                      i > 0 ? "border-t border-rule-soft" : ""
                    }`}
                  >
                    <span className="text-[10px] font-mono tabular-nums tracking-tight text-ink-faint px-2">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[15px] font-medium text-ink">
                      {t.shortName}
                    </p>
                    <p className="text-[13px] tabular-nums text-ink-soft">
                      {t.sessionTimes.join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="expectations" eyebrow="What we expect from you">
              <ul className="space-y-3 text-[15px] leading-[1.6] text-ink">
                {[
                  "Show up to live sessions — it's where most of the learning happens.",
                  "Submit reflections each week, even if they're short. They tell us what's landing.",
                  "Ask for help early. Message your instructor — don't get stuck silently.",
                  "Be a good cohort-mate. Encouragement matters more than you'd think.",
                ].map((line, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-ink-faint tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {isAdmin && (
              <Section id="instructor-guide" eyebrow="Instructor guide">
                <p className="text-[15px] leading-[1.6] text-ink-soft mb-6">
                  Reference for managing your tracks on {program.name}.
                </p>
                <div className="space-y-8">
                  <GuideBlock title="Adding meeting links & recordings">
                    <Steps
                      items={[
                        <>Go to <strong>Admin</strong> and select your track from the sidebar</>,
                        "Click a week to expand it, then add the meeting link before each session",
                        <>After the session, add the <strong>recording URL</strong> — it appears on the student&apos;s week page</>,
                        "Optionally update the week title, description, or objectives if content changed",
                      ]}
                    />
                  </GuideBlock>

                  <GuideBlock title="Reviewing submissions & reflections">
                    <Steps
                      items={[
                        <>Select your track, then switch to the <strong>Student Work</strong> sub-tab</>,
                        "You'll see all submissions and reflections for that track",
                        <>Click any entry to read the full submission and leave <strong>feedback</strong></>,
                        "Students receive your feedback on their dashboard — keep it constructive and specific",
                      ]}
                    />
                  </GuideBlock>

                  <GuideBlock title="Tracking attendance">
                    <Steps
                      items={[
                        <>Select your track, then switch to the <strong>Analytics</strong> sub-tab</>,
                        "See attendance rates, student engagement, and weekly trends",
                        "Click any student to see their full attendance history",
                      ]}
                    />
                  </GuideBlock>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({
  id,
  eyebrow,
  children,
}: {
  id: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-4">
        {eyebrow}
      </p>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-faint">{label}</dt>
      <dd className="text-[15px] font-medium text-ink mt-1">{value}</dd>
    </div>
  );
}

function PlatformRow({
  title,
  body,
  href,
}: {
  title: string;
  body: string;
  href?: string;
}) {
  const Tag = href ? "a" : "div";
  return (
    <li className="border-b border-rule-soft last:border-0">
      <Tag
        {...(href ? { href } : {})}
        className="block px-1 py-4 hover:bg-paper-tint-soft transition-colors"
      >
        <p className="text-[15px] font-medium text-ink">{title}</p>
        <p className="text-[13px] text-ink-soft mt-1">{body}</p>
      </Tag>
    </li>
  );
}

function GuideBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-[1.55] text-ink-soft">
          <span className="text-ink-faint tabular-nums shrink-0">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
