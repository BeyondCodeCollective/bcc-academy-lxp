import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";

// While a super-admin is "previewing as a student", the entire admin subtree is
// off-limits — preview must mean "treated as a student everywhere", not just
// hidden chrome. The per-page canAccessAdminPanel gates still handle real
// non-admins; this only adds the preview block, in one place for all admin pages.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (ctx && (await isPreviewingAsStudent(ctx.student?.role ?? ""))) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
