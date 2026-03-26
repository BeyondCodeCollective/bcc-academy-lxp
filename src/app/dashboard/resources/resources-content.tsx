"use client";

import { Books, VideoCamera, CalendarBlank, Envelope, Link as LinkIcon } from "@phosphor-icons/react";
import { ResourceList } from "@/components/resource-list";
import type { Resource } from "@/lib/types";

const instructors = [
  {
    name: "Ramon Clemente",
    role: "Head of ATG",
    track: "Program Lead",
    email: "ramon.clemente@wearebgc.org",
    calUrl: "https://cal.com/ramon-clemente",
    bio: "Oversees the After The Game program and guides students through their transition into tech.",
    initials: "RC",
    color: "bg-neutral-900 text-white",
    badge: "bg-neutral-100 text-neutral-700",
  },
  {
    name: "Kobe",
    role: "Instructor",
    track: "CompTIA Tech+",
    email: null,
    calUrl: "https://cal.com/kobie-joyner",
    bio: "Leads all live CompTIA Tech+ Foundations sessions — Wed & Fri, 10am–12pm ET.",
    initials: "KJ",
    color: "bg-blue-600 text-white",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    name: "Angel Aviles",
    role: "Instructor",
    track: "MASS Wraparound",
    email: null,
    calUrl: "https://cal.com/angel-aviles",
    bio: "Leads the 8-week MASS coaching series on mindset, accountability, soft skills, and networking.",
    initials: "AA",
    color: "bg-amber-500 text-white",
    badge: "bg-amber-50 text-amber-700",
  },
];

const quickLinks = [
  {
    label: "MASS Live Session",
    description: "Tuesdays 10am–12pm ET",
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
  {
    label: "CompTIA CertMaster",
    description: "Official study platform",
    url: "https://www.comptia.org/training/certmaster",
    icon: LinkIcon,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    label: "Professor Messer (Free)",
    description: "Tech+ video lessons",
    url: "https://www.professormesser.com/free-a-plus-training/fc0-u71/",
    icon: LinkIcon,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export function ResourcesContent({ resources }: { resources: (Resource & { content?: string })[] }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Resources</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Your instructors, course materials, and program links
        </p>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Quick Links
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
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {link.description}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Instructors */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Your Instructors
        </h2>
        <div className="grid gap-3">
          {instructors.map((inst) => (
            <div
              key={inst.name}
              className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${inst.color}`}
              >
                {inst.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-neutral-900">
                    {inst.name}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${inst.badge}`}
                  >
                    {inst.track}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{inst.role}</p>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                  {inst.bio}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {inst.email && (
                    <a
                      href={`mailto:${inst.email}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      <Envelope size={12} weight="bold" />
                      {inst.email}
                    </a>
                  )}
                  <a
                    href={inst.calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    <CalendarBlank size={12} weight="bold" />
                    Schedule Office Hours
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Materials */}
      {resources.length > 0 ? (
        <ResourceList resources={resources} />
      ) : (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Course Materials
          </h2>
          <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-12 text-center">
            <Books size={40} weight="bold" className="mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-900">
              Materials coming soon
            </p>
            <p className="mt-1 max-w-xs text-xs text-neutral-400">
              Course materials will be posted here as the program progresses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
