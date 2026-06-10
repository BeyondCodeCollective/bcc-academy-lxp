"use client";

import { useState } from "react";

const PUBLIC_SURVEY_LINKS = [
  { id: "bcc-learner-intake",        label: "BCC Learner Intake",              path: "/survey/bcc-learner-intake" },
  { id: "bcc-workshop",              label: "Workshop Survey",                  path: "/survey/bcc-workshop" },
  { id: "pre-survey-spring-2026",    label: "Pre-Survey (Spring 2026)",        path: "/survey/pre-survey-spring-2026" },
  { id: "post-survey-spring-2026",   label: "Post-Survey (Spring 2026)",       path: "/survey/post-survey-spring-2026" },
  { id: "network-plus-post",         label: "Network+ End-of-Cohort Survey",   path: "/survey/network-plus-post" },
  { id: "security-plus-application", label: "Security+ Application",           path: "/apply/security-plus" },
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

  const authLinks = surveyConfigs.map((s) => ({
    id: s.id,
    label: s.title,
    path: `/dashboard/survey/${s.id}`,
    auth: true,
  }));

  const allLinks = [
    ...PUBLIC_SURVEY_LINKS.map((s) => ({ ...s, auth: false })),
    ...authLinks,
  ];

  return (
    <div className="divide-y divide-rule border border-rule bg-surface-elevated">
      {allLinks.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-neutral-900 truncate">{s.label}</p>
            <p className="text-[11px] text-neutral-400 font-mono truncate">
              {typeof window !== "undefined" ? `${window.location.origin}${s.path}` : s.path}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {s.auth && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400 border border-neutral-200 px-1.5 py-0.5">
                login required
              </span>
            )}
            <button
              type="button"
              onClick={() => copy(s.path, s.id)}
              className="text-[11px] font-medium border border-rule px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              {copied === s.id ? "✓ Copied" : "Copy link"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
