import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { isStaffEmail } from "@/lib/auth/admins";
import { safeNextPath } from "@/lib/auth/next-path";

// One-time landing for a staff-domain email whose account was just
// auto-created by the auth callback. Its whole job is to make the fresh
// account NOT silent: a staffer who expected to see courses they teach (their
// real account lives under another email) finds out here instead of staring
// at an empty dashboard. Plain continue path for staff who really are new.
export default async function StaffWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  // Only meaningful for staff emails — anyone else routed here lands home.
  if (!isStaffEmail(ctx.student?.email ?? ctx.userEmail)) redirect("/dashboard");

  const { next } = await searchParams;
  const continueTo = safeNextPath(next) ?? "/dashboard";

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-5 py-16">
      <div className="panel p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Staff account
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Welcome — this is a brand-new account
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          We just created a staff account for{" "}
          <span className="font-medium text-ink">{ctx.student?.email ?? ctx.userEmail}</span>.
          It gives you access to Lunch &amp; Learns and internal content.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Expecting to see courses you teach or are enrolled in? Your existing
          account may be under a different email address — don&apos;t set up a
          second one. Email{" "}
          <a
            href="mailto:info@bccacademy.io"
            className="font-medium text-primary hover:underline"
          >
            info@bccacademy.io
          </a>{" "}
          and we&apos;ll link things up.
        </p>
        <div className="mt-6">
          <Link
            href={continueTo}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Continue to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
