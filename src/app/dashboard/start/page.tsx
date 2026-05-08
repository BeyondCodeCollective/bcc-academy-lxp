import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function GetStartedPage() {
  const program = await getProgram();
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  const weeklyTracks = program.tracks.filter((t) => t.type === "weekly");
  const cohort = program.defaultCohort;
  const startDate = new Date(cohort.startDate).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-12 md:py-16">
      <header className="mb-12 md:mb-14">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-3">
          Get Started
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold text-ink tracking-[-0.02em] leading-[0.95]">
          Welcome to {program.name}
        </h1>
        <p className="mt-5 text-[17px] leading-[1.65] text-ink max-w-2xl tracking-[-0.005em]">
          {program.tagline}. This page is your orientation — what to expect, how to
          use the platform, and where to get help.
        </p>
      </header>

      <div className="space-y-12">
        <Section eyebrow="Your cohort">
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
          <Section eyebrow="Weekly rhythm">
            <p className="text-[15px] leading-[1.6] text-ink-soft mb-5">
              Each week you&apos;ll have live sessions, a short reflection, and (for
              some tracks) a submission. Recordings post within a day if you miss a
              session.
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
                  <p className="text-[15px] font-medium text-ink truncate">{t.name}</p>
                  <p className="text-[13px] tabular-nums text-ink-soft">
                    {t.totalWeeks} weeks
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section eyebrow="How to use the platform">
          <ul className="border-y border-rule">
            <PlatformRow
              title="Home"
              body="Your weekly view — current week, upcoming sessions, reflections, and any submissions due."
            />
            {program.resourcesEnabled === true && (
              <PlatformRow
                title="Resources"
                body="Instructor contacts, meeting links, and study materials for each track."
                href="/dashboard/resources"
              />
            )}
            {program.tutorConfig?.enabled !== false && (
              <PlatformRow
                title="AI Tutor"
                body="A 24/7 study buddy that knows what you're working on this week. 30 messages per day."
                href="/dashboard/tutor"
              />
            )}
          </ul>
        </Section>

        <Section eyebrow="What we expect from you">
          <ul className="space-y-3 text-[15px] leading-[1.6] text-ink">
            <li className="flex gap-3">
              <span className="text-ink-faint tabular-nums">01</span>
              <span>Show up to live sessions — it&apos;s where most of the learning happens.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint tabular-nums">02</span>
              <span>Submit reflections each week, even if they&apos;re short. They tell us what&apos;s landing.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint tabular-nums">03</span>
              <span>Ask for help early. Use the AI Tutor or message your instructor — don&apos;t get stuck silently.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint tabular-nums">04</span>
              <span>Be a good cohort-mate. Encouragement matters more than you&apos;d think.</span>
            </li>
          </ul>
        </Section>

        <Section eyebrow="Stuck or need help?">
          <p className="text-[15px] leading-[1.6] text-ink">
            Open the{" "}
            <Link
              href="/dashboard/resources"
              className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            >
              Resources tab
            </Link>{" "}
            for instructor emails and booking links. For platform issues, reach out
            to your program lead directly.
          </p>
        </Section>

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
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
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
      <span className="text-[15px] font-medium text-ink min-w-[80px]">{title}</span>
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
        <Link href={href} className="group block hover:bg-paper-tint-soft transition-colors">
          {content}
        </Link>
      </li>
    );
  }
  return <li className="border-t border-rule-soft first:border-t-0">{content}</li>;
}
