import type { Metadata } from "next";
import Link from "next/link";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";

// Public privacy notice. Draft copy — finalize with legal/funder review
// before announcing at scale. Everything below is designed to be edited
// in place (no CMS); the consent text in the survey is the short version
// and this page is the long version.

export const metadata: Metadata = {
  title: "Privacy Notice — Beyond Code Collective",
  description:
    "How Beyond Code Collective handles your data on the BCC Learning Platform.",
};

export default function PrivacyPage() {
  const orgName = "Beyond Code Collective";

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-2 px-5 pt-4">
        <ReadAloudButton label="Read aloud" />
        <TextScaleToggle />
      </div>
      <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-12">
        <p className="text-xs font-medium uppercase tracking-wide text-[#1D59FF]">
          {orgName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-neutral-900">
          Privacy Notice — Draft
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          This notice is under legal review. The practices described below
          reflect how the system is built today.
        </p>

        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          <p>
            Your use of this platform is also governed by the{" "}
            <a
              href="https://www.wearebcc.org/en/terms"
              className="font-medium text-[#1D59FF] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              BCC Terms of Use
            </a>{" "}
            and the{" "}
            <a
              href="https://www.wearebcc.org/en/privacy"
              className="font-medium text-[#1D59FF] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              BCC Privacy Policy
            </a>
            . This notice covers how data is handled on the BCC Learning
            Platform specifically (surveys, program enrollment, and related
            program activity). Where the two differ, the more protective
            terms apply.
          </p>
        </div>

        <Section title="What we collect">
          <p>
            When you fill out a {orgName} survey, we collect the answers you
            provide — including your name, email, demographic information,
            and open-text reflections. We also collect a timestamp and the
            version of this notice you agreed to.
          </p>
        </Section>

        <Section title="Why we collect it">
          <ul>
            <li>To improve the program for current and future participants.</li>
            <li>
              To report aggregated outcomes (e.g., completion rates,
              demographic reach) to our funders and partners. Individual
              responses are not shared unless legally required.
            </li>
            <li>To contact you about your response if you opt in.</li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p>
            Survey responses are retained for up to <strong>5 years</strong>{" "}
            after submission so we can measure long-term program impact,
            after which your name is removed from the data. You can
            request earlier deletion at any time.
          </p>
        </Section>

        <Section title="Who can see it">
          <ul>
            <li>
              Authorized {orgName} staff and program evaluators, for the
              purposes above.
            </li>
            <li>
              Our hosting provider (Supabase) stores the data on our behalf
              under their data-processing terms.
            </li>
            <li>
              We do not sell your data and we do not share individual
              responses with third parties other than the evaluators and
              processors named above.
            </li>
          </ul>
        </Section>

        <Section title="Your rights">
          <ul>
            <li>
              <strong>Remove my response.</strong>{" "}
              <Link
                href="/privacy/withdraw"
                className="font-medium text-[#1D59FF] underline"
              >
                Submit a removal request
              </Link>
              , or email{" "}
              <a
                href="mailto:privacy@bccacademy.io"
                className="font-medium text-[#1D59FF] underline"
              >
                privacy@bccacademy.io
              </a>
              .
            </li>
            <li>
              <strong>Access or correct my data.</strong> Email the address
              above and we&apos;ll respond within 30 days.
            </li>
          </ul>
        </Section>

        <Section title="Security">
          <p>
            Data is encrypted in transit (HTTPS) and at rest (Supabase).
            Access to identifiable responses is limited to authorized staff
            and every staff view/export is logged.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions? Email{" "}
            <a
              href="mailto:privacy@bccacademy.io"
              className="font-medium text-[#1D59FF] underline"
            >
              privacy@bccacademy.io
            </a>
            .
          </p>
        </Section>

        <p className="mt-12 text-xs text-neutral-400">
          Last updated: draft pending legal review.
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-neutral-700 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
