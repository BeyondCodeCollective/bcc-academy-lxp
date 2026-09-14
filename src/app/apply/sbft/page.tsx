export const dynamic = "force-dynamic";

export const metadata = {
  title: "Apply — She's Built for This | Black Girls Code",
  description:
    "Applications for She's Built for This, a Saturday leadership cohort in Oakland for girls in 6th through 8th grade.",
};

// Applications paused 2026-09-14 at the programs team's request (cohort starts
// 9/26). To reopen, render <PublicApplyForm /> from ./public-apply-form again.
export default function SbftApplyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Black Girls Code
        </p>
        <h1 className="text-3xl font-bold text-neutral-900 mb-3">
          She&apos;s Built for This
        </h1>
        <p className="text-sm text-neutral-500">
          Applications for this cohort are now closed.
        </p>
      </div>
      <div className="border border-rule bg-surface-elevated p-8 sm:p-10">
        <p className="text-sm text-neutral-500">
          Thank you for your interest. If you already applied, we&apos;ll be in
          touch by email. Learn more about the program at{" "}
          <a href="https://bccacademy.io/bcc/shes-built-for-this" className="underline text-neutral-900">
            bccacademy.io/bcc/shes-built-for-this
          </a>
          .
        </p>
      </div>
    </div>
  );
}
