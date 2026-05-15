import { redirect } from "next/navigation";

export default function GetStartedPage() {
  redirect("/dashboard/help#welcome");
}
