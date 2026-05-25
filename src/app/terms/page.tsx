import type { Metadata } from "next";
import Link from "next/link";

// Short passthrough page. The canonical Terms of Use live on the BCC
// marketing site — we link out instead of duplicating to avoid drift.

export const metadata: Metadata = {
  title: "Terms of Use — Beyond Code Collective",
  description:
    "Your use of this platform is subject to the Beyond Code Collective Terms of Use.",
};

const BCC_TERMS_URL = "https://www.wearebcc.org/en/terms";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-lg px-5 py-12">
        <p className="text-xs font-medium uppercase tracking-wide text-[#E54D2E]">
          Beyond Code Collective
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Terms of Use</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Your use of this platform is subject to the Beyond Code Collective
          Terms of Use. We keep a single source of truth on the BCC website
          so the terms don&apos;t drift between places.
        </p>

        <a
          href={BCC_TERMS_URL}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the BCC Terms of Use →
        </a>

        <p className="mt-8 text-xs text-neutral-500">
          See the{" "}
          <Link
            href="/privacy"
            className="font-medium text-neutral-700 underline hover:text-neutral-900"
          >
            Privacy Notice
          </Link>{" "}
          for how we handle your data on this platform.
        </p>
      </div>
    </main>
  );
}
