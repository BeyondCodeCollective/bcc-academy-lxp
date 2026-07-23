import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { listStaffEmails } from "../actions-staff";
import { StaffListClient } from "./staff-list-client";

export const dynamic = "force-dynamic";

export default async function StaffListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  // Managing who counts as staff grants Lunch & Learns access and hides an
  // account from learner data — super-admin only.
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard");

  const rows = await listStaffEmails();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-faint">
          Access
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Staff list</h1>
        <p className="mt-2 max-w-prose text-sm text-ink-soft">
          Staff (BGC/BCC employees) only see Lunch & Learns, never courses, and
          never appear in learner metrics. <strong>@wearebgc.org</strong> accounts
          are staff automatically. Add staff on other domains (e.g. specific
          <strong> @wearebcc.org</strong> employees) here.
        </p>
      </header>
      <StaffListClient initial={rows} />
    </div>
  );
}
