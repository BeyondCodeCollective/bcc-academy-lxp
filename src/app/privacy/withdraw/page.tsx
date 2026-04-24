import Link from "next/link";
import { WithdrawForm } from "./withdraw-form";

export const dynamic = "force-dynamic";

export default function WithdrawPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-lg px-5 py-12">
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
          </a>{" "}
          · See the full{" "}
          <Link
            href="/privacy"
            className="font-medium text-neutral-700 underline hover:text-neutral-900"
          >
            privacy notice
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
