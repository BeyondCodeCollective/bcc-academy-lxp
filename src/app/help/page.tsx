import { getSessionContext } from "@/lib/auth/session";
import { HelpCenter } from "./help-center";

// The help center is public, but only partly: signed out it covers what the
// platform is, how a learner uses it and what happens to their data. The
// instructor, admin, course-management and platform guides describe running the
// place, so they wait behind a sign-in. The scope itself lives in
// `visibleSections()`; this shell only answers "is anyone signed in".
export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const ctx = await getSessionContext();
  return <HelpCenter signedIn={Boolean(ctx)} />;
}
