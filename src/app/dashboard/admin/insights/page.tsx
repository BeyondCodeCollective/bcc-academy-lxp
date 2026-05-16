import { redirect } from "next/navigation";

// Insights moved into the Admin tab system. This route just redirects
// so existing bookmarks/links still work.
export default function InsightsPageRedirect() {
  redirect("/dashboard/admin?tab=insights");
}
