"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";

const PUBLIC_SURVEY_LINKS = [
  { id: "bcc-learner-intake",        label: "BCC Learner Intake",                        path: "/survey/bcc-learner-intake" },
  { id: "bcc-workshop",              label: "Workshop Feedback",                          path: "/survey/bcc-workshop" },
  { id: "pre-survey-spring-2026",    label: "AI Fundamentals — Pre-Program Survey",       path: "/survey/pre-survey-spring-2026" },
  { id: "post-survey-spring-2026",   label: "AI Fundamentals — Post-Program Survey",      path: "/survey/post-survey-spring-2026" },
  { id: "network-plus-post",         label: "CompTIA Network+ — End-of-Cohort Survey",    path: "/survey/network-plus-post" },
  { id: "security-plus-application", label: "CompTIA Security+ — Application",            path: "/apply/security-plus" },
  { id: "security-plus-midpoint",    label: "CompTIA Security+ — Midpoint Check-In",      path: "/survey/security-plus-midpoint" },
];

export function SurveyLinksSection({ surveyConfigs }: { surveyConfigs: { id: string; title: string }[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (path: string, id: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const authLinks = [
    { id: "pathway-assessment", label: "Pathway Assessment", path: "/dashboard/assessment", auth: true },
    // Platform-level auth survey: not in program.surveys, so surveyConfigs
    // below won't surface it.
    { id: "security-plus-midpoint", label: "CompTIA Security+ — Midpoint Check-In", path: "/dashboard/survey/security-plus-midpoint", auth: true },
    ...surveyConfigs.map((s) => ({
      id: s.id,
      label: s.title,
      path: `/dashboard/survey/${s.id}`,
      auth: true,
    })),
  ];

  const allLinks = [
    ...PUBLIC_SURVEY_LINKS.map((s) => ({ ...s, auth: false })),
    ...authLinks,
  ];

  return (
    <div className="divide-y divide-rule overflow-hidden panel">
      {allLinks.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink truncate">{s.label}</p>
            <p className="text-micro text-ink-faint font-mono truncate">
              {typeof window !== "undefined" ? `${window.location.origin}${s.path}` : s.path}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {s.auth ? (
              <span className="text-micro font-medium uppercase tracking-wide text-ink-faint border border-rule px-1.5 py-0.5">
                login required
              </span>
            ) : (
              <span className="text-micro font-medium uppercase tracking-wide text-ink-faint border border-rule px-1.5 py-0.5">
                no login
              </span>
            )}
            <a
              href={s.path}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open survey"
              className="inline-flex items-center justify-center border border-rule p-1.5 text-ink-faint hover:bg-paper-tint-soft hover:text-ink-soft transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
            <button
              type="button"
              onClick={() => copy(s.path, s.id)}
              className={buttonClass("secondary", "sm")}
            >
              {copied === s.id ? "✓ Copied" : "Copy link"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
