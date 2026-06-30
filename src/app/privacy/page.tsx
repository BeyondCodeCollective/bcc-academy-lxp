import type { Metadata } from "next";
import Link from "next/link";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";

// Portal-wide privacy notice. Draft copy — finalize with legal/funder review
// before announcing at scale. Everything below is designed to be edited
// in place (no CMS). It covers the whole BCC Learning Platform: accounts,
// enrollment, dashboard activity, surveys, and the newsletter — not just
// surveys. The short consent text shown inside a survey is the summary;
// this page is the full version.

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
          reflect how the platform is built today. It applies to the entire
          BCC Learning Platform — your account, the programs you enroll in,
          your dashboard activity, surveys, and our newsletter.
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
            Platform specifically. Where the two differ, the more protective
            terms apply.
          </p>
        </div>

        <Section title="What we collect">
          <p>We collect the following, depending on how you use the platform:</p>
          <ul>
            <li>
              <strong>Account &amp; profile.</strong> Your name, email address,
              and the password or sign-in link you use to log in, plus your
              role (student, instructor, admin) and the program and cohort
              you belong to.
            </li>
            <li>
              <strong>Program &amp; enrollment.</strong> The tracks and programs
              you join, your start date, and your enrollment status.
            </li>
            <li>
              <strong>Learning activity.</strong> Attendance, the work and
              projects you submit, your weekly reflections, your progress
              through each course, and any announcements you interact with.
            </li>
            <li>
              <strong>Surveys &amp; reflections.</strong> The answers you provide
              in {orgName} surveys — including demographic information and
              open-text responses — along with a timestamp and the version of
              this notice you agreed to.
            </li>
            <li>
              <strong>Technical &amp; usage.</strong> Basic usage events (for
              example, pages and lessons you open) that we use to understand
              engagement and improve the program, plus standard log data your
              browser sends.
            </li>
            <li>
              <strong>Newsletter.</strong> If you sign up for updates, the email
              address you provide for that purpose.
            </li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          <ul>
            <li>To run the program and give you access to your dashboard, courses, and materials.</li>
            <li>To improve the program for current and future participants.</li>
            <li>
              To report aggregated outcomes (e.g., completion rates,
              demographic reach) to our funders and partners. Individual
              responses are not shared unless legally required.
            </li>
            <li>To contact you about your enrollment, or about your survey response if you opt in.</li>
          </ul>
        </Section>

        <Section title="Cookies & sign-in">
          <p>
            We use cookies that are necessary for the platform to work —
            chiefly to keep you signed in and to route you to the right
            program. We do not use advertising or third-party tracking
            cookies.
          </p>
        </Section>

        <Section title="AI features">
          <p>
            Some programs offer an optional AI tutor. When you choose to use
            it, the messages you send are processed by our AI provider solely
            to generate a response, under terms that prohibit using your
            content to train their models. The tutor is off unless your
            program has enabled it, and using it is always your choice.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Survey responses are retained for up to <strong>5 years</strong>{" "}
            after submission so we can measure long-term program impact,
            after which your name is removed from the data. Account and
            learning records are kept for as long as your account is active
            and as needed for program reporting. You can request earlier
            deletion at any time.
          </p>
        </Section>

        <Section title="Who can see it">
          <ul>
            <li>
              Authorized {orgName} staff, instructors for your program, and
              program evaluators, for the purposes above.
            </li>
            <li>
              Our service providers store and process data on our behalf under
              their data-processing terms — our hosting and database provider
              (Supabase), our application host (Vercel), our AI tutor provider
              (where enabled), and our email/newsletter provider (Mailchimp).
            </li>
            <li>
              We do not sell your data, and we do not share individual records
              with third parties other than the evaluators and processors
              named above.
            </li>
          </ul>
        </Section>

        <Section title="Young learners">
          <p>
            Our programs welcome learners of all ages. For youth programs,
            enrollment is arranged through a parent, guardian, or partner
            organization, and we collect only what is needed to deliver the
            program. If you are a parent or guardian and have a question about
            a young learner&apos;s data, contact us at the address below.
          </p>
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
              <strong>Access, correct, or delete my data.</strong> Email the
              address above and we&apos;ll respond within 30 days.
            </li>
            <li>
              <strong>Unsubscribe.</strong> You can opt out of the newsletter at
              any time using the link in any email we send.
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
