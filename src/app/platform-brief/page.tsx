import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Why We Own the Platform — BCC Academy",
  robots: { index: false, follow: false },
};

// Internal strategy brief: the board/team-facing argument for owning the
// platform vs. publishing to YouTube, plus the YouTube integration plan.
// Same staff-only pattern as /platform-map — a presentation surface, not a
// product screen, so it lives outside the /dashboard shell.

const COMPARISON: { label: string; youtube: string; academy: string }[] = [
  {
    label: "Who watched",
    youtube: "A view count",
    academy:
      "Named attendance — which of the 80 enrolled girls showed up, per session",
  },
  {
    label: "Who gets in",
    youtube: "Anyone, anytime — or an unlisted link anyone can forward",
    academy: "Enrollment, allowlists, day-of unlocks, age-appropriate controls",
  },
  {
    label: "What they do",
    youtube: "Watch",
    academy:
      "Build — submissions, reflections, and surveys attached to the same student record",
  },
  {
    label: "What it ends in",
    youtube: "Autoplay of the next video",
    academy:
      "A verifiable certificate on a public link a hiring manager can click",
  },
  {
    label: "Who owns the audience",
    youtube: "Google — reachable only through its algorithm",
    academy: "We do — emails, one-click logins, reminder campaigns",
  },
  {
    label: "The environment",
    youtube:
      "Ads, comments, and “recommended next” pulling a ten-year-old somewhere else",
    academy: "A world containing only Day 1, Day 2, and Day 3",
  },
  {
    label: "The paper trail",
    youtube: "None",
    academy:
      "Signed agreements, consent, and privacy controls appropriate for minors",
  },
];

const LIVE_TOOLS: { label: string; zoom: string; ytLive: string }[] = [
  {
    label: "Direction",
    zoom: "Two-way — cameras on, instructor sees every student",
    ytLive: "One-way broadcast",
  },
  {
    label: "Attendance",
    zoom: "Students join under their real names automatically",
    ytLive: "Tracked by our own page-presence data, not names in the stream",
  },
  {
    label: "Audience size",
    zoom: "Bounded by the meeting license",
    ytLive: "Effectively unlimited, free",
  },
  {
    label: "Replay",
    zoom: "Cloud recordings auto-import hourly; past sessions show the replay",
    ytLive: "Automatic — the stream URL becomes the replay",
  },
  {
    label: "Best for",
    zoom: "Camps and cohorts — Roblox bootcamp, Security+",
    ytLive: "Showcases, Lunch & Learns, large webinars, demo days",
  },
];

const LAUNCH_STEPS: { title: string; detail: string }[] = [
  {
    title: "Create the course",
    detail:
      "Program staff build it in Manage Courses — sessions, schedule, instructor — no engineering, no deploy.",
  },
  {
    title: "Attach the content",
    detail:
      "Lesson videos can be unlisted YouTube links today; the classroom already embeds them.",
  },
  {
    title: "Load the roster",
    detail:
      "Allowlist or Eventbrite feed provisions every student with a permanent one-click login.",
  },
];

const RECOMMENDATIONS: { title: string; detail: string }[] = [
  {
    title: "Keep Zoom for interactive cohorts.",
    detail:
      "It carried the Roblox bootcamp end-to-end (58/58 completions), cameras-on is what we promise parents, attendance tracks by name, and recordings now flow back onto the platform automatically.",
  },
  {
    title: "Add YouTube Live as the broadcast option after camp.",
    detail:
      "A small, additive build: paste a YouTube Live URL into a session and the classroom shows the stream — then the replay, automatically. Ideal for showcases and Lunch & Learns.",
  },
  {
    title: "Treat content production as the strategic investment.",
    detail:
      "The rails are done. Every new course is now configuration plus content — and content published through our platform compounds into attendance, credentials, and funder-ready evidence instead of view counts.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs uppercase tracking-[0.18em] text-primary"
      style={{ fontFamily: "var(--font-geist-mono)" }}
    >
      {children}
    </p>
  );
}

function ComparisonTable({
  caption,
  leftHead,
  rightHead,
  rows,
}: {
  caption: string;
  leftHead: string;
  rightHead: string;
  rows: { label: string; left: string; right: string }[];
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm leading-relaxed">
        <caption
          className="pb-3 text-left text-[11px] uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            <th className="w-[22%] border-b-2 border-ink pb-2" />
            <th className="w-[36%] border-b-2 border-ink pb-2 pr-4 text-[13px] font-bold text-ink">
              {leftHead}
            </th>
            <th className="border-b-2 border-ink pb-2 text-[13px] font-bold text-primary">
              {rightHead}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="align-top">
              <td className="whitespace-nowrap border-b border-rule-soft py-2.5 pr-4 font-semibold text-ink">
                {row.label}
              </td>
              <td className="border-b border-rule-soft py-2.5 pr-4 text-ink-soft">
                {row.left}
              </td>
              <td className="border-b border-rule-soft py-2.5 text-ink">
                {row.right}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PlatformBriefPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-7 pb-24 pt-16">
        <header>
          <SectionLabel>BCC Academy · Strategy Brief · August 2026</SectionLabel>
          <h1 className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Why we own the platform
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            What BCC Academy does that YouTube can&rsquo;t, what it takes to
            launch new programs on it, and how we&rsquo;ll use YouTube —
            including YouTube Live — as an ingredient rather than a competitor.
          </p>
        </header>

        {/* Executive summary */}
        <div className="panel mt-10 p-6">
          <p
            className="text-[11px] uppercase tracking-[0.14em] text-ink-faint"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Executive summary
          </p>
          <ul className="mt-4 flex flex-col gap-3.5 text-[15px] leading-relaxed">
            <li className="relative pl-5">
              <span className="absolute left-0 top-[0.5em] h-2 w-2 bg-primary" />
              <b className="font-semibold">
                YouTube is distribution. BCC Academy is evidence.
              </b>{" "}
              The same video that produces a view count on YouTube produces
              named attendance, submissions, surveys, and a verifiable
              credential on our platform — the data our funders pay for.
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0 top-[0.5em] h-2 w-2 bg-primary" />
              <b className="font-semibold">
                The rails are built; content is the cargo.
              </b>{" "}
              Launching a new program is now configuration and content, not
              engineering. Content is our permanently recurring cost — the
              platform is what multiplies its value.
            </li>
            <li className="relative pl-5">
              <span className="absolute left-0 top-[0.5em] h-2 w-2 bg-primary" />
              <b className="font-semibold">
                YouTube already works inside the platform
              </b>{" "}
              for recorded lessons, and adding YouTube Live for broadcast
              events is a small build. Zoom remains the tool for interactive
              cohorts like the Roblox bootcamp.
            </li>
          </ul>
        </div>

        {/* The core distinction */}
        <section className="mt-14">
          <SectionLabel>The core distinction</SectionLabel>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            Same video, two worlds
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            The question &ldquo;what makes this different from YouTube?&rdquo;
            has a one-line answer: YouTube can host the pixels, but it cannot
            tell a funder what happened to seat&nbsp;#47. YouTube is built to
            maximize watch time for advertisers. BCC Academy is built to prove
            outcomes for students — and everything that distinguishes the two
            follows from that.
          </p>

          <ComparisonTable
            caption="The same lesson, published two ways"
            leftHead="On YouTube"
            rightHead="On BCC Academy"
            rows={COMPARISON.map((r) => ({
              label: r.label,
              left: r.youtube,
              right: r.academy,
            }))}
          />

          <blockquote className="mt-10">
            <p className="text-2xl font-bold leading-snug tracking-tight text-ink sm:text-[28px]">
              &ldquo;Did the students actually grow?&rdquo; —{" "}
              <mark className="bg-highlight box-decoration-clone px-1.5 py-0.5 font-bold text-[#1a1a1a]">
                you can only answer that if you own the platform.
              </mark>
            </p>
            <footer
              className="mt-3 text-[12px] text-ink-faint"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Intake survey → attendance → submissions → post-survey →
              credential: one student record, end to end, exportable for any
              funder report.
            </footer>
          </blockquote>

          <p className="mt-8 text-[15px] leading-relaxed text-ink-soft">
            This is the argument that wins board rooms and grant reviews. On
            YouTube, engagement data belongs to Google and describes an
            anonymous audience. On BCC Academy, every step from first click to
            certificate lands in one record we own — which means when a funder
            asks what happened with the seats they paid for, the answer is a
            page, not an estimate.
          </p>
        </section>

        {/* The content question */}
        <section className="mt-14">
          <SectionLabel>The content question</SectionLabel>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            &ldquo;Once we have the content, are we good to go?&rdquo;
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Structurally, yes. The platform work — multi-program branding,
            enrollment, one-click login, live classrooms, surveys, analytics,
            certificates — is built and running. Standing up a new program
            today looks like this:
          </p>

          <ol className="mt-6 border-t border-rule-soft">
            {LAUNCH_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-[2.4rem_1fr] gap-x-4 border-b border-rule-soft py-4"
              >
                <span className="text-lg font-bold text-primary tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-ink">{step.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">
            The honest caveat: content is the{" "}
            <em className="text-ink">permanently recurring</em> cost, and the
            platform doesn&rsquo;t reduce it. What the platform does is
            multiply its value. A video published to YouTube produces views.
            The same video published through BCC Academy produces attendance,
            completions, certificates, and the receipts that renew funding.
            Owning the rails means every dollar spent producing content
            compounds instead of evaporating into a view count.
          </p>
        </section>

        {/* Integration strategy */}
        <section className="mt-14">
          <SectionLabel>Integration strategy</SectionLabel>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            YouTube as an ingredient, not a competitor
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            We don&rsquo;t have to choose between owning the platform and using
            YouTube — YouTube becomes our free, world-class video
            infrastructure, wrapped in our identity, gating, and data layer.
          </p>

          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
            <b className="font-semibold text-ink">Recorded video</b>
            <span className="ml-2 inline-block rounded-full bg-highlight px-2 py-0.5 align-[0.1em] text-[10px] font-bold uppercase tracking-[0.1em] text-[#1a1a1a]">
              Live today
            </span>
            <br />
            The classroom already plays YouTube-hosted recordings natively.
            Publishing a lesson as an unlisted YouTube video costs nothing in
            storage or bandwidth and appears inside the course like any other
            lesson.
          </p>

          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
            <b className="font-semibold text-ink">
              YouTube Live for broadcast events
            </b>
            <span className="ml-2 inline-block rounded-full border border-rule bg-paper-tint-soft px-2 py-0.5 align-[0.1em] text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Proposed · small build
            </span>
            <br />
            Teaching the session&rsquo;s meeting-link field to recognize a
            YouTube Live URL puts the live stream directly in the
            classroom&rsquo;s &ldquo;live now&rdquo; slot. The standout
            benefit: when the stream ends, the same URL automatically becomes
            the replay — the live session turns into the recording with zero
            extra work. Roughly a half-day of work, fully additive, and
            existing Zoom sessions are untouched.
          </p>

          <ComparisonTable
            caption="Choosing the live tool per event"
            leftHead="Zoom (in-classroom embed)"
            rightHead="YouTube Live (proposed)"
            rows={LIVE_TOOLS.map((r) => ({
              label: r.label,
              left: r.zoom,
              right: r.ytLive,
            }))}
          />

          <div className="mt-6 rounded-r-lg border-l-[3px] border-amber-500 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-ink-soft">
            <p className="mb-1 font-bold text-ink">
              One caution before pointing kids at a live stream
            </p>
            YouTube Live chat requires a Google account, and its comment
            surface is public — a compliance and safety problem for programs
            serving minors. For youth events we embed the stream with chat
            disabled and keep interaction inside our platform. Interactive
            youth cohorts stay on Zoom.
          </div>
        </section>

        {/* Recommendation */}
        <div className="mt-14 rounded-xl bg-ink p-8 text-paper">
          <p
            className="text-[11px] uppercase tracking-[0.14em] text-highlight"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Recommendation
          </p>
          <ol className="mt-5 flex flex-col gap-5">
            {RECOMMENDATIONS.map((rec, i) => (
              <li
                key={rec.title}
                className="grid grid-cols-[2.2rem_1fr] gap-x-3.5"
              >
                <span className="text-xl font-bold text-highlight tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold tracking-tight">{rec.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed opacity-85">
                    {rec.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <footer
          className="mt-14 flex flex-wrap items-baseline justify-between gap-3 border-t border-rule-soft pt-5 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <span>Internal — prepared for board &amp; team</span>
          <span className="flex flex-wrap gap-x-8 gap-y-2">
            <a href="/platform-map" className="hover:text-ink-soft">↳ The platform map</a>
            <a href="/platform-features" className="hover:text-ink-soft">↳ The feature set</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
