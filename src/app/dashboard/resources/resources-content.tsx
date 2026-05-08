"use client";

import { Envelope, CalendarBlank } from "@phosphor-icons/react";

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

export function ResourcesContent() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-12 md:py-16">
      <header className="mb-12 md:mb-14">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-3">
          Resources
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold text-ink tracking-[-0.02em] leading-[0.95]">
          Instructors, sessions, materials
        </h1>
        <p className="mt-5 text-[17px] leading-[1.65] text-ink max-w-2xl tracking-[-0.005em]">
          Everything you need to reach your team and keep moving — contacts,
          weekly meeting links, and study material.
        </p>
      </header>

      <div className="space-y-12">
        <Section eyebrow="Your instructors">
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
                  <p className="text-[12px] text-ink-soft mt-0.5">{inst.track}</p>
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

        <Section eyebrow="Live sessions">
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
                  <p className="text-[15px] font-medium text-ink">{link.label}</p>
                  <p className="text-[13px] tabular-nums text-ink-soft">
                    {link.description}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="Study resources">
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
                    <p className="text-[12px] text-ink-faint">{res.source}</p>
                  </div>
                  <p className="mt-1 ml-[44px] text-[13px] leading-[1.55] text-ink-soft">
                    {res.description}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </Section>
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
