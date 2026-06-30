"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui";
import { signParticipationAgreement } from "@/lib/onboarding/actions";

// Catalyst Program Participation Agreement — Cybersecurity Final Version.
type Point = string | { text: string; bold: true };

const SECTIONS: { n: string; heading: string; lede: string; points: Point[] }[] = [
  {
    n: "1",
    heading: "My Time Commitment",
    lede: "This program requires real time. Before you commit, make sure the schedule works for you.",
    points: [
      "The program runs approximately 12 weeks, with an estimated 6–8 hours per week which includes instructor-led technology sessions, coursework, coaching, and community.",
      "I have reviewed the program schedule and confirmed that I can participate for the full duration.",
      "I understand that the time commitment is a condition of completing the program and receiving any associated certificate or credential.",
    ],
  },
  {
    n: "2",
    heading: "My Attendance",
    lede: "Live sessions are critical to your learning and success. Attendance matters here.",
    points: [
      "I commit to attending 80% or more of all scheduled live sessions.",
      "If I need to miss a session, I will notify the program team at least 24 hours in advance whenever possible.",
      "I understand that missing more than 2 sessions may affect my candidacy to complete the program or receive a certificate.",
      "I understand I am responsible for catching up on any missed material independently and will reach out to the instructor with questions or for clarification as needed.",
    ],
  },
  {
    n: "3",
    heading: "My Commitment to Learning",
    lede: "Active engagement is what drives real outcomes.",
    points: [
      "I will complete assigned readings, exercises, and pre-session work before each live session.",
      "I will engage actively during sessions — contributing questions, perspectives, and feedback.",
      {
        text: "I will join calls with camera on whenever possible to directly engage with my instructors and peers.",
        bold: true,
      },
      "I will complete my track's capstone deliverable or final project as part of fulfilling the program.",
      "I will ask for help early if I fall behind, knowing that support is available.",
    ],
  },
  {
    n: "4",
    heading: "My Commitment to the Community",
    lede: "Your cohort is a learning community. What people share here deserves care.",
    points: [
      "I will engage with my peers with respect, curiosity, and generosity, regardless of their background or experience level.",
      "I will hold in confidence the personal stories, experiences, and work shared by other participants during this program.",
      "I will show up as a contributor to the space, not just a recipient of it, supporting peers through feedback, collaboration, and encouragement.",
      "I will not engage in behavior that undermines the learning environment, including disrespectful communication, harassment, or exclusion of any kind.",
    ],
  },
  {
    n: "5",
    heading: "My Commitment to Communication",
    lede: "We don't expect perfection, but communication is key.",
    points: [
      "If something changes in my life that impacts my participation, I will reach out to the program team directly.",
      "I will respond in a timely manner to team communications.",
      "I understand that consistent, unexplained absence without communication may result in removal from the cohort.",
    ],
  },
  {
    n: "6",
    heading: "My Technology Readiness",
    lede: "Participation in this program requires access to basic technology. It is your responsibility to be ready before sessions begin.",
    points: [
      "I have access to a device (laptop or desktop strongly preferred) and a stable internet connection sufficient for video sessions.",
      "I have access to or will create the accounts or tools required for this program prior to the first session.",
      "I will troubleshoot technical issues proactively and notify the team as early as possible if I anticipate a barrier to participating.",
    ],
  },
  {
    n: "7",
    heading: "If I Need to Step Back",
    lede: "We want every person who starts this program to finish it. But we also know life is real. If something changes, here is what we ask.",
    points: [
      "If I need to pause or withdraw from the program, I will communicate that directly to the program team.",
      "Stepping back does not close my relationship with Beyond Code Collective. I understand that early communication opens the door to future relationships, opportunities, placement or other support.",
    ],
  },
];

export function ParticipationAgreementModal({
  open,
  onClose,
  trackSlug,
  programSlug,
  cohort,
  defaultName,
}: {
  open: boolean;
  onClose: () => void;
  trackSlug: string;
  programSlug: string;
  cohort: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) return null;

  const canSubmit = agreed && name.trim().length > 1 && !pending;

  const submit = () => {
    setError(null);
    start(async () => {
      try {
        await signParticipationAgreement(trackSlug, name, programSlug);
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Participation Agreement"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-paper shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {cohort}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-ink">Participation Agreement</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable agreement body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <p className="text-sm leading-relaxed text-ink-soft">
            Joining a Beyond Code cohort is a choice — for yourself and for the people learning
            alongside you. This agreement names what that looks like. It is a commitment you are
            making to your own growth and to the community you are about to build. Please read each
            section carefully. Once submitted, our team will confirm your enrollment.
          </p>

          <div className="mt-5 space-y-5">
            {SECTIONS.map((s) => (
              <section key={s.n}>
                <h3 className="text-sm font-bold text-ink">
                  <span className="text-primary">{s.n} —</span> {s.heading}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{s.lede}</p>
                <ul className="mt-2 space-y-1.5">
                  {s.points.map((p, i) => {
                    const text = typeof p === "string" ? p : p.text;
                    const bold = typeof p === "object" && p.bold;
                    return (
                      <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-soft">
                        <span aria-hidden className="mt-1.5 h-1 w-1 flex-none rounded-full bg-primary" />
                        <span className={bold ? "font-bold text-ink" : undefined}>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-6 text-sm font-medium leading-relaxed text-ink">
            By checking the box below, I confirm that I have read this agreement, understand what is
            being asked of me, and am choosing to participate with that full understanding.
          </p>
        </div>

        {/* Sign-off footer */}
        <div className="border-t border-rule px-5 py-4 sm:px-7">
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[#1D59FF]"
            />
            <span>I have read and agree to the Catalyst Program Participation Agreement.</span>
          </label>

          <label className="mt-3 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Full name (your signature)
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your full name"
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </label>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className={buttonClass("secondary", "md")}>
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={`${buttonClass("primary", "md")} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {pending ? "Signing…" : "Sign and submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
