"use client";

import {
  VideoCamera,
  CalendarBlank,
  Envelope,
  Link as LinkIcon,
  Certificate,
} from "@phosphor-icons/react";

const instructors = [
  {
    name: "Ramon Clemente",
    track: "Program Lead",
    email: "ramon.clemente@wearebgc.org",
    calUrl: "https://cal.com/ramon-clemente",
    initials: "RC",
    color: "bg-neutral-900 text-white",
  },
  {
    name: "Kobie Joyner",
    track: "CompTIA Tech+",
    email: "kkjoyner@gmail.com",
    calUrl: "https://cal.com/kobie-joyner",
    initials: "KJ",
    color: "bg-blue-600 text-white",
  },
  {
    name: "Angel Aviles",
    track: "MASS",
    email: "angel.aviles@wearebgc.org",
    calUrl: "https://cal.com/angel-aviles",
    initials: "AA",
    color: "bg-amber-500 text-white",
  },
];

const quickLinks = [
  {
    label: "MASS Live Session",
    description: "Wednesdays 10–11am ET",
    url: "https://meet.google.com",
    icon: VideoCamera,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "CompTIA Live Session",
    description: "Wed & Fri 10am–12pm ET",
    url: "https://meet.google.com",
    icon: VideoCamera,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
];

const studyResources = [
  {
    label: "CompTIA Tech+ Certification",
    description: "Official certification overview, exam details, and career paths",
    url: "https://www.comptia.org/en-us/certifications/tech/",
    icon: Certificate,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
];

export function ResourcesContent() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Resources</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Instructors, live sessions, and study materials
        </p>
      </div>

      {/* Instructors — compact 3-column row */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Your Instructors
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {instructors.map((inst) => (
            <div
              key={inst.name}
              className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white px-2 py-4 text-center"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold ${inst.color}`}
              >
                {inst.initials}
              </div>
              <p className="mt-2 text-xs font-semibold text-neutral-900 leading-tight">
                {inst.name}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-400">{inst.track}</p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`mailto:${inst.email}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
                  title={`Email ${inst.name}`}
                >
                  <Envelope size={13} weight="bold" />
                </a>
                <a
                  href={inst.calUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
                  title="Schedule Office Hours"
                >
                  <CalendarBlank size={13} weight="bold" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Live Sessions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${link.bg}`}>
                  <Icon size={16} weight="bold" className={link.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 leading-tight">
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {link.description}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Study Resources */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Study Resources
        </h2>
        <div className="grid gap-2">
          {studyResources.map((res) => {
            const Icon = res.icon;
            return (
              <a
                key={res.label}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${res.bg}`}>
                  <Icon size={16} weight="bold" className={res.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 leading-tight">
                    {res.label}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500 truncate">
                    {res.description}
                  </p>
                </div>
                <LinkIcon size={14} weight="bold" className="shrink-0 text-neutral-300" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
