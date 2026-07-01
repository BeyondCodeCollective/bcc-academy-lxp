"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui";
import { signCatalystAgreement } from "@/lib/onboarding/actions";

// Catalyst Program Participation Agreement — After the Game cohort (2026-07).
const SECTIONS: { n: string; heading: string; lede: string; points: string[] }[] = [
  {
    n: "1",
    heading: "My Time Commitment",
    lede: "This program requires real time. Before you commit, make sure the schedule works for you.",
    points: [
      "The program runs approximately 10 months, with an estimated 4–5 hours per week which includes instructor-led technology sessions, coursework, coaching, and community.",
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
      "I understand that missing more than 5 sessions may affect my candidacy to complete the program or receive a certificate.",
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

export function CatalystAgreement({
  programSlug,
  defaultName,
  alreadySigned,
  signedName,
  signedAt,
}: {
  programSlug: string;
  defaultName: string;
  alreadySigned: boolean;
  signedName?: string;
  signedAt?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadySigned);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-electric-green/15 text-electric-green">
          <Check size={26} weight="bold" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">You&rsquo;re all set.</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your participation agreement is signed
          {signedName ? <> as <span className="font-semibold text-ink">{signedName}</span></> : null}
          {signedAt ? <> on {new Date(signedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</> : null}. Our team will confirm your enrollment.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          Back to your dashboard
        </button>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await signCatalystAgreement(name, programSlug);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
        Catalyst · After the Game Cohort
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Program Participation Agreement</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        Joining a Beyond Code cohort is a choice — for yourself and for the people learning
        alongside you. This agreement names what that looks like. It is a commitment you are making
        to your own growth and to the community you are about to build. Please read each section
        carefully. Once submitted, our team will confirm your enrollment.
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.n} className="border-t border-rule pt-5">
            <h2 className="text-base font-bold text-ink">
              <span className="text-ink-faint">{s.n}</span> &nbsp;{s.heading}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{s.lede}</p>
            <ul className="mt-3 space-y-2">
              {s.points.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-green" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <form onSubmit={submit} className="mt-10 border-t border-rule pt-6">
        <h2 className="text-base font-bold text-ink">My Commitment</h2>
        <p className="mt-1 text-sm text-ink-soft">
          By signing below, I confirm that I have read this agreement, understand what is being
          asked of me, and am choosing to participate with that full understanding.
        </p>
        <label htmlFor="sign-name" className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink-faint">
          Type your full name to sign
        </label>
        <input
          id="sign-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
          className="mt-1.5 w-full border border-rule bg-white px-4 py-3 text-base text-ink focus:border-ink-faint focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className={`${buttonClass("primary", "md")} mt-4 w-full sm:w-auto disabled:opacity-50`}
        >
          {pending ? "Signing…" : "Agree & sign"}
        </button>
      </form>
    </div>
  );
}
