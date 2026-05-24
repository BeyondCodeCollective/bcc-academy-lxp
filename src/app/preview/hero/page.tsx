// Public mock comparison page (no auth) for the AI Literacy track hero.
// Renders the three variants stacked so you can scroll and compare without
// logging in. Delete this route once the winner is picked.
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { toneForTrack, iconForTrack } from "@/lib/track-visual";

export const dynamic = "force-static";

const TRACK = {
  slug: "ai-literacy",
  name: "AI Literacy",
  totalWeeks: 10,
  overview:
    "What AI actually is, what it isn't, and who gets to define it. This opening session grounds the program in a clear, plain-language understanding of artificial intelligence before any tool use begins. A conceptual video session — no submission.",
  weekSummaries: [
    { week: 1, topic: "What AI Is", icon: "🤖" },
    { week: 2, topic: "AI & Bias", icon: "⚖️" },
    { week: 3, topic: "Prompt Design", icon: "✍️" },
    { week: 4, topic: "Digital Identity", icon: "🪪" },
    { week: 5, topic: "Communication", icon: "💬" },
    { week: 6, topic: "Productivity", icon: "⚡" },
    { week: 7, topic: "Learning", icon: "📚" },
    { week: 8, topic: "Innovation", icon: "💡" },
    { week: 9, topic: "Research", icon: "🔍" },
    { week: 10, topic: "Entrepreneurship", icon: "🚀" },
  ],
};

const CURRENT_WEEK = 10;
const STARTED = true;

export default function HeroMockPage() {
  const tone = toneForTrack(TRACK.slug);
  const Icon = iconForTrack(TRACK.slug);

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="mx-auto w-full max-w-2xl px-5 md:max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">
          Track hero mocks — comparison
        </h1>
        <p className="mb-8 text-sm text-neutral-500">
          Three variants of the same hero for `/dashboard/track/ai-literacy`,
          rendered without auth so you can compare. Scroll through them and
          tell me which to ship.
        </p>

        <Section label="A — Default (current production)">
          <HeroDefault tone={tone} Icon={Icon} />
        </Section>

        <Section label="B — Typographic (drops the tinted block)">
          <HeroTypo tone={tone} />
        </Section>

        <Section label="C — Curriculum grid (icons + topics fill the block)">
          <HeroGrid tone={tone} />
        </Section>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      <p className="mb-3 inline-block bg-neutral-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
        {label}
      </p>
      <div className="border border-neutral-200 p-5">{children}</div>
    </div>
  );
}

function HeroShell({ children }: { children: React.ReactNode }) {
  return <header className="space-y-5">{children}</header>;
}

function CTA() {
  return (
    <div>
      <Link
        href="#"
        className="inline-flex items-center gap-2 bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        Open current week — Week {CURRENT_WEEK}
        <ArrowRight size={14} weight="bold" />
      </Link>
    </div>
  );
}

function InProgressPillFloating({ tone }: { tone: string }) {
  return (
    <div className="absolute top-4 right-4">
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold backdrop-blur"
        style={{ color: tone }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: tone }}
        />
        In progress
      </span>
    </div>
  );
}

function Eyebrow() {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
      Week {CURRENT_WEEK} of {TRACK.totalWeeks}
      <span className="mx-2 text-neutral-300">·</span>
      {TRACK.totalWeeks}-week track
    </p>
  );
}

function HeroDefault({
  tone,
  Icon,
}: {
  tone: string;
  Icon: ReturnType<typeof iconForTrack>;
}) {
  return (
    <HeroShell>
      <div
        aria-hidden
        className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${tone}1A` }}
      >
        <Icon size={72} weight="light" color={tone} />
        {STARTED && <InProgressPillFloating tone={tone} />}
      </div>
      <div>
        <Eyebrow />
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {TRACK.name}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-600">
          {TRACK.overview}
        </p>
      </div>
      <CTA />
    </HeroShell>
  );
}

function HeroTypo({ tone }: { tone: string }) {
  return (
    <HeroShell>
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow />
          {STARTED && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: `${tone}1A`, color: tone }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: tone }}
              />
              In progress
            </span>
          )}
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl">
          {TRACK.name}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-neutral-600">
          {TRACK.overview}
        </p>
      </div>
      <CTA />
    </HeroShell>
  );
}

function HeroGrid({ tone }: { tone: string }) {
  return (
    <HeroShell>
      <div
        className="relative w-full overflow-hidden p-5 sm:p-7"
        style={{ backgroundColor: `${tone}1A` }}
      >
        <ol className="grid grid-cols-5 gap-2 sm:gap-3">
          {TRACK.weekSummaries.map((ws) => {
            const isCurrent = ws.week === CURRENT_WEEK;
            return (
              <li
                key={ws.week}
                className="flex aspect-square flex-col items-center justify-center bg-white/85 p-1.5 backdrop-blur sm:p-2"
                style={
                  isCurrent
                    ? { boxShadow: `inset 0 0 0 2px ${tone}` }
                    : undefined
                }
              >
                <span className="text-xl leading-none sm:text-2xl">
                  {ws.icon}
                </span>
                <span className="mt-1 line-clamp-2 px-0.5 text-center text-[9px] font-medium leading-tight text-neutral-600 sm:text-[10px]">
                  {ws.topic}
                </span>
              </li>
            );
          })}
        </ol>
        {STARTED && <InProgressPillFloating tone={tone} />}
      </div>
      <div>
        <Eyebrow />
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {TRACK.name}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-600">
          {TRACK.overview}
        </p>
      </div>
      <CTA />
    </HeroShell>
  );
}
