import { redirect } from "next/navigation";

// "Add People" / Invites is now unified into the People hub — adding people
// (invite by email OR add directly) lives in the "Add people" panel on the
// People tab. Redirect old links/bookmarks there. The form/panel/actions in
// this folder + allowlist/ are still reused by the People hub's add panel.
export default function AddPeopleRedirect() {
  redirect("/dashboard/admin?tab=students");
}
