import Link from "next/link";
import { redirect } from "next/navigation";
import {
  House,
  Books,
  ChatsCircle,
  CheckCircle,
  CalendarBlank,
  Lifebuoy,
} from "@phosphor-icons/react/dist/ssr";
import { getProgram } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function GetStartedPage() {
  const program = await getProgram();
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  const weeklyTracks = program.tracks.filter((t) => t.type === "weekly");
  const cohort = program.defaultCohort;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      <div className="space-y-8">
        <header>
          <p className="text-xs uppercase tracking-wider text-neutral-500">Get Started</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-neutral-900">
            Welcome to {program.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {program.tagline}. This page is your orientation — what to expect, how to use the
            platform, and where to get help.
          </p>
        </header>

        <Section title="Your cohort" icon={<CalendarBlank size={20} weight="bold" />}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-neutral-500">Cohort</dt>
              <dd className="font-medium text-neutral-900">{cohort.displayName}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Start date</dt>
              <dd className="font-medium text-neutral-900">
                {new Date(cohort.startDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Length</dt>
              <dd className="font-medium text-neutral-900">{cohort.totalWeeks} weeks</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Tracks you&apos;re in</dt>
              <dd className="font-medium text-neutral-900">
                {program.tracks.map((t) => t.shortName).join(", ")}
              </dd>
            </div>
          </dl>
        </Section>

        {weeklyTracks.length > 0 && (
          <Section title="Weekly rhythm" icon={<CalendarBlank size={20} weight="bold" />}>
            <p className="text-sm text-neutral-600 mb-3">
              Each week you&apos;ll have live sessions, a short reflection, and (for some tracks) a
              submission. Recordings post within a day if you miss a session.
            </p>
            <ul className="space-y-2 text-sm">
              {weeklyTracks.map((t) => (
                <li key={t.slug} className="flex items-start gap-2">
                  <CheckCircle
                    size={16}
                    weight="bold"
                    className="mt-0.5 shrink-0 text-neutral-400"
                  />
                  <span>
                    <strong className="text-neutral-900">{t.name}</strong>
                    <span className="text-neutral-600">
                      {" "}
                      — {t.totalWeeks} weeks
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="How to use the platform" icon={<House size={20} weight="bold" />}>
          <ul className="space-y-3 text-sm">
            <PlatformItem
              icon={<House size={18} weight="bold" />}
              title="Home"
              body="Your weekly view — current week, upcoming sessions, reflections, and any submissions due."
            />
            {(program.resourcesEnabled === true) && (
              <PlatformItem
                icon={<Books size={18} weight="bold" />}
                title="Resources"
                body="Instructor contacts, meeting links, and study materials for each track."
                href="/dashboard/resources"
              />
            )}
            {program.tutorConfig?.enabled !== false && (
              <PlatformItem
                icon={<ChatsCircle size={18} weight="bold" />}
                title="AI Tutor"
                body="A 24/7 study buddy that knows what you're working on this week. 30 messages per day."
                href="/dashboard/tutor"
              />
            )}
          </ul>
        </Section>

        <Section title="What we expect from you" icon={<CheckCircle size={20} weight="bold" />}>
          <ul className="space-y-2 text-sm text-neutral-700 list-disc list-inside">
            <li>Show up to live sessions — it&apos;s where most of the learning happens.</li>
            <li>Submit reflections each week, even if they&apos;re short. They tell us what&apos;s landing.</li>
            <li>Ask for help early. Use the AI Tutor or message your instructor — don&apos;t get stuck silently.</li>
            <li>Be a good cohort-mate. Encouragement matters more than you&apos;d think.</li>
          </ul>
        </Section>

        <Section title="Stuck or need help?" icon={<Lifebuoy size={20} weight="bold" />}>
          <p className="text-sm text-neutral-700">
            Open the{" "}
            <Link href="/dashboard/resources" className="font-medium text-neutral-900 underline underline-offset-2">
              Resources tab
            </Link>{" "}
            for instructor emails and booking links. For platform issues, reach out to your program
            lead directly.
          </p>
        </Section>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            Go to my dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-neutral-500">{icon}</span>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PlatformItem({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="mt-0.5 shrink-0 text-neutral-500">{icon}</span>
      <span>
        <strong className="text-neutral-900">{title}</strong>
        <span className="block text-neutral-600">{body}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <li>
        <Link
          href={href}
          className="flex items-start gap-2 rounded-lg -mx-2 px-2 py-1 hover:bg-neutral-50 transition-colors"
        >
          {inner}
        </Link>
      </li>
    );
  }

  return <li className="flex items-start gap-2 px-0 py-1">{inner}</li>;
}
