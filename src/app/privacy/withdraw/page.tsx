import Link from "next/link";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { WithdrawForm } from "./withdraw-form";

export const dynamic = "force-dynamic";

export default function WithdrawPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-lg items-center justify-end gap-2 px-5 pt-4">
        <ReadAloudButton label="Read aloud" />
        <TextScaleToggle />
      </div>
      <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-12">
        <p className="text-xs font-medium uppercase tracking-wide text-[#E54D2E]">
          Beyond Code Collective
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">
          Remove my survey response
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter the email you used when taking the survey. We&apos;ll delete
          every response tied to that address. This is immediate and cannot
          be undone.
        </p>

        <div className="mt-6">
          <WithdrawForm />
        </div>

        <p className="mt-8 text-xs text-neutral-500">
          Prefer email?{" "}
          <a
            href="mailto:privacy@bccacademy.io"
            className="font-medium text-neutral-700 underline hover:text-neutral-900"
          >
            privacy@bccacademy.io
          </a>
        </p>

        <div className="mt-4 flex items-center gap-3 text-xs text-neutral-400">
          <a
            href="https://www.wearebcc.org/en/terms"
            className="hover:text-neutral-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms
          </a>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-neutral-600">
            Privacy
          </Link>
        </div>
      </div>
    </main>
  );
}
