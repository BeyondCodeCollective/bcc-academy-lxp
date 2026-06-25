"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Circle, ArrowRight, Confetti } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui";
import { ParticipationAgreementModal } from "@/components/participation-agreement";

export type ChecklistItemView = {
  id: string;
  label: string;
  description: string;
  kind: "survey" | "agreement";
  href?: string;
  completed: boolean;
};

export function OnboardingChecklist({
  title,
  intro,
  items,
  allComplete,
  trackSlug,
  programSlug,
  cohort,
  defaultName,
}: {
  title: string;
  intro: string;
  items: ChecklistItemView[];
  allComplete: boolean;
  trackSlug: string;
  programSlug: string;
  cohort: string;
  defaultName?: string;
}) {
  const [agreementOpen, setAgreementOpen] = useState(false);

  if (allComplete) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-12">
        <div className="panel p-7 text-center sm:p-9">
          <span
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "#E5F701" }}
          >
            <Confetti size={24} weight="bold" className="text-[#1a1a1a]" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">
            Thank you for completing your application materials.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            We will reach out with more details shortly! Keep an eye on your inbox — welcome to the{" "}
            {cohort}.
          </p>
        </div>
      </div>
    );
  }

  const doneCount = items.filter((i) => i.completed).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      {/* Header — short and flat, no gradient */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          You&apos;re accepted · {doneCount} of {items.length} complete
        </p>
        <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">{intro}</p>
      </div>

      {/* Checklist */}
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={item.id} className="panel p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              {item.completed ? (
                <CheckCircle size={26} weight="fill" className="flex-none text-primary" aria-hidden />
              ) : (
                <Circle size={26} weight="regular" className="flex-none text-ink-faint" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-ink">
                  <span className="text-ink-faint">{idx + 1}.</span>
                  {item.label}
                  {item.completed && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Done
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{item.description}</p>

                {!item.completed && (
                  <div className="mt-3">
                    {item.kind === "agreement" ? (
                      <button
                        type="button"
                        onClick={() => setAgreementOpen(true)}
                        className={buttonClass("primary", "md")}
                      >
                        Review and sign
                        <ArrowRight size={15} weight="bold" />
                      </button>
                    ) : item.href ? (
                      <Link
                        href={`${item.href}?return=${encodeURIComponent(`/dashboard/track/${trackSlug}`)}`}
                        className={buttonClass("primary", "md")}
                      >
                        {item.kind === "survey" ? "Start" : "Open"}
                        <ArrowRight size={15} weight="bold" />
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        Your acceptance is contingent on completing all three. Anything you&apos;ve already done is
        checked off automatically.
      </p>

      <ParticipationAgreementModal
        open={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        trackSlug={trackSlug}
        programSlug={programSlug}
        cohort={cohort}
        defaultName={defaultName}
      />
    </div>
  );
}
