import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InvitesPanel } from "./invites-panel";

// Bulk send paces at ~2/sec; give it room for a few hundred recipients.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const ctx = await getSessionContext();
  if (!canSwitchPrograms(ctx?.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const [{ data: allow }, { data: invites }] = await Promise.all([
    svc.from("allowed_signup_emails").select("track_slug"),
    svc.from("invites").select("track_slug, status, used_at"),
  ]);

  const tally = new Map<string, { invited: number; sent: number; opened: number }>();
  const get = (slug: string) =>
    tally.get(slug) ?? { invited: 0, sent: 0, opened: 0 };
  for (const a of allow ?? []) {
    const t = get(a.track_slug as string);
    t.invited++;
    tally.set(a.track_slug as string, t);
  }
  for (const i of invites ?? []) {
    const t = get(i.track_slug as string);
    if (i.status === "sent") t.sent++;
    if (i.used_at) t.opened++;
    tally.set(i.track_slug as string, t);
  }
  const tracks = Array.from(tally.entries())
    .map(([slug, c]) => ({ slug, ...c }))
    .sort((a, b) => b.invited - a.invited);

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8">
      <PageHeader
        title="Invites"
        subtitle="Send one-click login invites to allowlisted students. Each gets a link that signs them in — no password, and it never expires until they're in."
      />
      <InvitesPanel tracks={tracks} />
    </div>
  );
}
