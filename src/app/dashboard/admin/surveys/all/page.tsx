import { redirect } from "next/navigation";

// The unified dashboard at /dashboard/admin/surveys now shows the full
// per-survey breakdown plus the cross-survey rollup on one page, so this
// route just bounces back to it. Kept as a redirect (instead of a 404) so
// any saved bookmarks from before the consolidation continue to work.
export default function AllSurveysRedirect() {
  redirect("/dashboard/admin/surveys");
}
