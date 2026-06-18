import { redirect } from "next/navigation";

// The standalone allowlist surface was merged into "Add People" — managing who
// can join now lives alongside sending invites. Redirect (preserving ?track) so
// old links/bookmarks keep working. The form/picker/actions in this folder are
// still used by the Add People page.
export default async function AllowlistRedirect({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track } = await searchParams;
  redirect(`/dashboard/admin/invites${track ? `?track=${track}` : ""}`);
}
