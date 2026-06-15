import Link from "next/link";
import { confirmWithdrawal } from "../actions";

export const dynamic = "force-dynamic";

// Token-gated landing for the public-survey withdrawal flow. The request
// step (POST email → emails a signed token link) is in withdraw-form.tsx;
// this page is what that link points to. Verifying + deleting happens
// server-side via confirmWithdrawal — no client trust.
export default async function ConfirmWithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await confirmWithdrawal({ token })
    : { ok: false as const, error: "Missing token." };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-12">
        <p className="text-xs font-medium uppercase tracking-wide text-[#1D59FF]">
          Beyond Code Collective
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">
          {result.ok ? "Done." : "Couldn't confirm"}
        </h1>
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
          {result.ok ? (
            <p className="text-sm text-neutral-700">
              All public survey responses for this email have been deleted.
              Thank you.
            </p>
          ) : (
            <>
              <p className="text-sm text-neutral-700">{result.error}</p>
              <Link
                href="/privacy/withdraw"
                className="mt-4 inline-block text-sm font-medium text-neutral-900 underline"
              >
                Request a new link →
              </Link>
            </>
          )}
        </div>
        <p className="mt-8 text-xs text-neutral-500">
          Questions?{" "}
          <a
            href="mailto:privacy@bccacademy.io"
            className="font-medium text-neutral-700 underline hover:text-neutral-900"
          >
            privacy@bccacademy.io
          </a>
        </p>
      </div>
    </main>
  );
}
