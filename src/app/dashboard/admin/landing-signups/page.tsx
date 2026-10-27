import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { requireManager, allowedTrackSlugsForActor } from "../actions-shared";
import { resolveTrackLengths } from "@/lib/programs/scope";
import { humanizeSlug } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../manage-menu";
import { CourseSelect } from "./course-select";
import { computeCourseSignups, loadSignups, SignupsPanel, signupsSummary } from "./signups-panel";

export const dynamic = "force-dynamic";

export default async function SignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; page?: string; session?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // Registrations key on track_slug, not program, so a program admin's view is
  // "every course in my program". Super-admins see every course.
  const actor = await requireManager();
  const allowedTracks = await allowedTrackSlugsForActor(actor, actor.svc);

  const { allRegs, usedToken, pageRows } = await loadSignups(allowedTracks);

  // Courses with any registration, newest activity first. Only courses the
  // platform can name; stray slugs from old tests don't get a chip.
  const names = await resolveTrackLengths([...new Set(allRegs.map((r) => r.track))]);
  const latestBy = new Map<string, string>();
  for (const r of allRegs) {
    if (!names.has(r.track)) continue;
    const prev = latestBy.get(r.track);
    if (!prev || r.at > prev) latestBy.set(r.track, r.at);
  }
  const courses = [...latestBy.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([slug]) => slug);
  const countBy = new Map<string, number>();
  for (const r of allRegs) countBy.set(r.track, (countBy.get(r.track) ?? 0) + 1);

  const sp = await searchParams;
  // Old ?page=<landing slug> links resolve to that page's course.
  const fromPage = sp.page ? (pageRows.find((p) => p.slug === sp.page)?.track_slug ?? null) : null;
  const requested = sp.course ?? fromPage ?? null;
  // No default: the page opens on the picker alone; nothing shows until a course is chosen.
  const course = requested && courses.includes(requested) ? requested : null;
  const courseName = course ? (names.get(course)?.name ?? humanizeSlug(course)) : null;
  const model = course ? await computeCourseSignups({ allRegs, usedToken, pageRows }, course, sp.session) : null;
  const sessionHref = (id: string | null) =>
    `?course=${encodeURIComponent(course ?? "")}${id ? `&session=${encodeURIComponent(id)}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={courseName ? `${courseName} signups` : "Signups"}
        subtitle={
          model
            ? signupsSummary(model)
            : courses.length
              ? "Choose a course to see who signed up."
              : "No signups yet."
        }
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />

      {/* Course picker: one course at a time. */}
      {courses.length > 0 && (
        <CourseSelect
          value={course ?? ""}
          courses={courses.map((slug) => ({
            slug,
            name: names.get(slug)?.name ?? humanizeSlug(slug),
            count: countBy.get(slug) ?? 0,
          }))}
        />
      )}

      {model && course && (
        <SignupsPanel
          model={model}
          sessionHref={sessionHref}
          rosterHref={`/dashboard/admin?tab=${encodeURIComponent(course)}&view=students`}
        />
      )}
    </div>
  );
}
