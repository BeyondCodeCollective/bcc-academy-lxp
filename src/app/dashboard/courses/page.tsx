import { redirect } from "next/navigation";

// The standalone Courses catalog was an admin-only second list of the same
// courses as the admin home — redundant. The admin home (/dashboard/admin) is
// now the single course hub (each course has Manage + Open-student-view), so
// this route just forwards there. Students never had access to this page.
export default function CoursesIndexPage() {
  redirect("/dashboard/admin");
}
