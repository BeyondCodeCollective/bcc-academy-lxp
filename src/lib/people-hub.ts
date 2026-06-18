// People hub status model. A person moves through: Allowlisted → Invited →
// Joined → Active. Account-holders (students) carry Joined/Active (derived from
// last_seen_at, in the UI). This module surfaces the PRE-account people —
// allowlisted or invited emails that don't have a student row yet — so the
// roster can show the full pipeline in one place.
//
// Allowlist + invites are keyed by track_slug (the live schema), so we scope by
// the current program's track slugs.

import { createServiceClient } from "@/lib/supabase/server";

export type PendingStatus = "invited" | "allowlisted";

export type PendingPerson = {
  email: string;
  status: PendingStatus;
  /** Track slugs this person is allowlisted/invited for, within the program. */
  trackSlugs: string[];
  /** True if an invite was sent but not yet used (for "Resend" vs "Send"). */
  inviteSent: boolean;
};

/**
 * Emails that are allowlisted or invited for the program's tracks but do NOT
 * yet have a student account. `studentEmails` is the set of existing account
 * emails (lowercased) to exclude.
 */
export async function fetchPendingPeople(
  trackSlugs: string[],
  studentEmails: Set<string>,
): Promise<PendingPerson[]> {
  if (trackSlugs.length === 0) return [];
  const svc = createServiceClient();

  const [allowRes, inviteRes] = await Promise.all([
    svc.from("allowed_signup_emails").select("email, track_slug").in("track_slug", trackSlugs),
    svc
      .from("invites")
      .select("email, track_slug, status")
      .in("track_slug", trackSlugs),
  ]);

  // Build per-email rollup.
  const byEmail = new Map<
    string,
    { tracks: Set<string>; invited: boolean; sent: boolean }
  >();
  const get = (email: string) => {
    const key = email.toLowerCase();
    let e = byEmail.get(key);
    if (!e) {
      e = { tracks: new Set(), invited: false, sent: false };
      byEmail.set(key, e);
    }
    return e;
  };

  for (const a of (allowRes.data ?? []) as { email: string; track_slug: string }[]) {
    if (!a.email) continue;
    get(a.email).tracks.add(a.track_slug);
  }
  for (const i of (inviteRes.data ?? []) as {
    email: string;
    track_slug: string;
    status: string;
  }[]) {
    if (!i.email) continue;
    const e = get(i.email);
    e.tracks.add(i.track_slug);
    e.invited = true;
    if (i.status === "sent") e.sent = true;
  }

  const out: PendingPerson[] = [];
  for (const [email, e] of byEmail.entries()) {
    if (studentEmails.has(email)) continue; // already has an account → not pending
    out.push({
      email,
      status: e.invited ? "invited" : "allowlisted",
      trackSlugs: Array.from(e.tracks),
      inviteSent: e.sent,
    });
  }
  // Invited first (further along the pipeline), then alphabetical.
  out.sort((a, b) =>
    a.status === b.status ? a.email.localeCompare(b.email) : a.status === "invited" ? -1 : 1,
  );
  return out;
}
