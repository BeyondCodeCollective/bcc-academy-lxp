import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import { resolveCurrentUser } from "@/lib/current-user";
import { canAccessAdminPanel } from "@/lib/roles";
import {
  Envelope,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

// Reference content for the portal. Consolidates the former /dashboard/start,
// /dashboard/resources, and /dashboard/guide routes into a single sectioned
// page so the sidebar can stay focused on workspaces. Admin-only sections
// (Instructor Guide) are gated below.

const instructors = [
  {
    name: "Ramon Clemente",
    track: "Program Lead",
    email: "ramon.clemente@wearebgc.org",
    calUrl: "https://cal.com/ramon-clemente",
  },
  {
    name: "Kobie Joyner",
    track: "CompTIA Tech+",
    email: "kkjoyner@gmail.com",
    calUrl: "https://cal.com/kobie-joyner",
  },
  {
    name: "Angel Aviles",
    track: "MASS",
    email: "angel.aviles@wearebgc.org",
    calUrl: "https://cal.com/angel-aviles",
  },
];

const liveSessions = [
  {
    label: "MASS Live Session",
    description: "Tuesdays · 10–11am ET",
    url: "https://meet.google.com",
  },
  {
    label: "CompTIA Live Session",
    description: "Wed & Fri · 10am–12pm ET",
    url: "https://meet.google.com",
  },
];

const studyResources = [
  {
    label: "CompTIA Tech+ Certification",
    description:
      "Official certification overview, exam details, and career paths.",
    url: "https://www.comptia.org/en-us/certifications/tech/",
    source: "comptia.org",
  },
  {
    label: "What Career Is Right for Me?",
    description: "Explore different tech career paths and find your fit.",
    url: "https://www.youtube.com/watch?v=P2YIwlkUW58",
    source: "youtube.com",
  },
];

export default async function HelpPage() {
  const program = await getProgram();
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");

  const isAdmin = canAccessAdminPanel(currentUser.userRole);

  const weeklyTracks = program.tracks.filter((t) => t.type === "weekly");
  const singleEventTracks = program.tracks.filter(
    (t) => t.type === "single-event"
  );
  const cohort = program.defaultCohort;
  const startDate = new Date(cohort.startDate).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const toc: { id: string; label: string }[] = [
    { id: "welcome", label: "Welcome" },
    { id: "cohort", label: "Your cohort" },
    ...(weeklyTracks.length > 0
      ? [{ id: "rhythm", label: "Weekly rhythm" }]
      : []),
    { id: "platform", label: "Using the platform" },
    { id: "instructors", label: "Instructors" },
    { id: "live-sessions", label: "Live sessions" },
    { id: "study", label: "Study materials" },
    { id: "expectations", label: "What we expect" },
    ...(isAdmin ? [{ id: "instructor-guide", label: "Instructor guide" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-6xl px-4 sm:px-5 py-12 md:py-16">
      <div className="md:grid md:grid-cols-[200px_1fr] md:gap-x-12">
        {/* Sticky TOC on desktop */}
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
            <Section id="cohort" eyebrow="Your cohort">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <Fact label="Cohort" value={cohort.displayName} />
                <Fact label="Start date" value={startDate} />
                <Fact label="Length" value={`${cohort.totalWeeks} weeks`} />
                <Fact
                  label="Tracks you're in"
                  value={program.tracks.map((t) => t.shortName).join(", ")}
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
                        {t.totalWeeks} weeks
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
                  body="This page. Instructor contacts, study materials, and weekly rhythm."
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

            <Section id="instructors" eyebrow="Your instructors">
              <ul className="border-y border-rule">
                {instructors.map((inst, i) => (
                  <li
                    key={inst.name}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-6 px-1 py-4 ${
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
                    <div className="flex items-center gap-3">
                      <a
                        href={`mailto:${inst.email}`}
                        className="text-ink-faint hover:text-ink transition-colors"
                        title={`Email ${inst.name}`}
                      >
                        <Envelope size={16} weight="regular" />
                      </a>
                      <a
                        href={inst.calUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink-faint hover:text-ink transition-colors"
                        title="Schedule office hours"
                      >
                        <CalendarBlank size={16} weight="regular" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="live-sessions" eyebrow="Live sessions">
              <ul className="border-y border-rule">
                {liveSessions.map((link, i) => (
                  <li
                    key={link.label}
                    className={i > 0 ? "border-t border-rule-soft" : ""}
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 px-1 py-4 hover:bg-paper-tint-soft transition-colors"
                    >
                      <span className="text-[10px] font-mono tabular-nums tracking-tight text-ink-faint px-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[15px] font-medium text-ink">
                        {link.label}
                      </p>
                      <p className="text-[13px] tabular-nums text-ink-soft">
                        {link.description}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="study" eyebrow="Study materials">
              <ul className="border-y border-rule">
                {studyResources.map((res, i) => (
                  <li
                    key={res.label}
                    className={i > 0 ? "border-t border-rule-soft" : ""}
                  >
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block px-1 py-4 hover:bg-paper-tint-soft transition-colors"
                    >
                      <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6">
                        <span className="text-[10px] font-mono tabular-nums tracking-tight text-ink-faint px-2">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="text-[15px] font-medium text-ink truncate">
                          {res.label}
                        </p>
                        <p className="text-[12px] text-ink-faint">
                          {res.source}
                        </p>
                      </div>
                      <p className="mt-1 ml-[44px] text-[13px] leading-[1.55] text-ink-soft">
                        {res.description}
                      </p>
                    </a>
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
                        <>
                          Go to <strong>Admin → Curriculum</strong>
                        </>,
                        "Select your track and the week you want to update",
                        <>
                          Add the <strong>meeting link</strong> before each
                          session so students can join from their dashboard
                        </>,
                        <>
                          After the session, add the{" "}
                          <strong>recording URL</strong> — it appears on the
                          student&apos;s week page automatically
                        </>,
                        "Optionally update the week title, description, or objectives if content changed",
                      ]}
                    />
                  </GuideBlock>

                  <GuideBlock title="Reviewing submissions & reflections">
                    <Steps
                      items={[
                        <>
                          Go to <strong>Admin → Student Work</strong>
                        </>,
                        "Filter by track — you'll see all student work for your assigned tracks",
                        <>
                          Click any entry to read the full submission and leave{" "}
                          <strong>feedback</strong>
                        </>,
                        "Students receive your feedback on their dashboard — keep it constructive and specific",
                      ]}
                    />
                    {weeklyTracks.length > 0 && (
                      <p className="mt-3 text-[12px] text-ink-faint">
                        Tracks with submissions enabled:{" "}
                        {weeklyTracks
                          .filter((t) => t.submissionsEnabled !== false)
                          .map((t) => t.name)
                          .join(", ") || "None currently"}
                      </p>
                    )}
                  </GuideBlock>

                  <GuideBlock title="Tracking attendance">
                    <Steps
                      items={[
                        <>
                          Go to <strong>Admin → Analytics</strong>
                        </>,
                        "Select the track and week",
                        "Check off students who attended each session — this data feeds engagement tracking",
                      ]}
                    />
                  </GuideBlock>

                  <GuideBlock title="Posting announcements">
                    <Bullets
                      items={[
                        <>
                          Go to <strong>Admin → People</strong> to post a
                          message that appears as a banner on all students&apos;
                          dashboards
                        </>,
                        "Use announcements for schedule changes, reminders, or encouragement",
                        "Announcements expire automatically after the date you set",
                      ]}
                    />
                  </GuideBlock>

                  {singleEventTracks.length > 0 && (
                    <GuideBlock title="Single-event tracks">
                      <Bullets
                        items={[
                          <>
                            Single-event tracks (
                            {singleEventTracks.map((t) => t.name).join(", ")})
                            require students to complete an intake form before
                            accessing session content
                          </>,
                          <>
                            Intake responses are visible in the{" "}
                            <strong>Surveys</strong> tab
                          </>,
                          "These tracks don't have weekly submissions or reflections",
                        ]}
                      />
                    </GuideBlock>
                  )}

                  <GuideBlock title="Data & exports">
                    <Bullets
                      items={[
                        "Attendance data can be exported as CSV from the Analytics tab",
                        "Survey responses can be exported from the Surveys tab",
                        "All data is scoped to your program — instructors only see their assigned tracks",
                      ]}
                    />
                  </GuideBlock>
                </div>
              </Section>
            )}

            <div className="pt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-paper hover:bg-[#2A2520] transition-colors"
              >
                Go to my dashboard →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <dt className="text-[12px] text-ink-faint mb-1">{label}</dt>
      <dd className="text-[15px] font-medium text-ink">{value}</dd>
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
  const content = (
    <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 px-1 py-4">
      <span className="text-[15px] font-medium text-ink min-w-[80px]">
        {title}
      </span>
      <p className="text-[14px] leading-[1.55] text-ink-soft">{body}</p>
      {href && (
        <span className="text-[12px] text-ink-faint group-hover:text-ink transition-colors">
          →
        </span>
      )}
    </div>
  );
  if (href) {
    return (
      <li className="border-t border-rule-soft first:border-t-0">
        <Link
          href={href}
          className="group block hover:bg-paper-tint-soft transition-colors"
        >
          {content}
        </Link>
      </li>
    );
  }
  return <li className="border-t border-rule-soft first:border-t-0">{content}</li>;
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
    <ol className="space-y-2 text-[14px] leading-[1.55] text-ink-soft">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-ink-faint tabular-nums shrink-0">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 text-[14px] leading-[1.55] text-ink-soft">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-ink-faint shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
