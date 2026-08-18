import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { resolveTrackLengths } from "@/lib/programs/scope";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui";
import { ManageMenu } from "../manage-menu";
import { CopyLinkButton } from "./copy-link-button";

export const dynamic = "force-dynamic";

// Landing-page signups, grouped by the LANDING PAGE people came through. One
// page at a time: the page's own headline is the title ("Your story gets you
// the offer"), the funnel is the subtitle, the course it enrolls into is a
// detail line. Multiple live registrations never pile onto one screen — you
// pick the page. A signup is allowlisted and emailed a one-click link on the
// spot; this shows who took the next step and hands you the link for the rest.

type SignupRow = {
  id: string;
  slug: string;
  track_slug: string;
  email: string;
  name: string | null;
  invite_token: string | null;
  created_at: string;
};

type Stage = "signed-up" | "tapped-link" | "enrolled";

export default async function LandingSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_signups")
    .select("id, slug, track_slug, email, name, invite_token, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  const all = (data ?? []) as SignupRow[];

  // Landing pages that have signups, newest activity first. The picker lists these.
  const pageSlugsAll: string[] = [];
  for (const r of all) if (!pageSlugsAll.includes(r.slug)) pageSlugsAll.push(r.slug);
  const { page: requested } = await searchParams;
  const pageSlug = requested && pageSlugsAll.includes(requested) ? requested : pageSlugsAll[0] ?? null;
  const rows = pageSlug ? all.filter((r) => r.slug === pageSlug) : [];
  // The course this page enrolls into (a page has one track; rows agree).
  const course = rows[0]?.track_slug ?? null;
  const names = await resolveTrackLengths(course ? [course] : []);
  const courseName = course ? (names.get(course)?.name ?? course) : null;

  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))];
  const tokens = rows.map((r) => r.invite_token).filter((t): t is string => !!t);

  const [{ data: students }, { data: invites }, { data: enrollments }, { data: pages }] =
    await Promise.all([
      emails.length
        ? svc.from("students").select("id, email, is_staff, is_test").in("email", emails)
        : Promise.resolve({ data: [] as { id: string; email: string; is_staff: boolean; is_test: boolean }[] }),
      tokens.length
        ? svc.from("invites").select("token, used_at").in("token", tokens)
        : Promise.resolve({ data: [] as { token: string; used_at: string | null }[] }),
      course
        ? svc.from("student_tracks").select("student_id").eq("track_slug", course)
        : Promise.resolve({ data: [] as { student_id: string }[] }),
      svc.from("landing_pages").select("slug, headline, published"),
    ]);

  const studentByEmail = new Map(
    ((students ?? []) as { id: string; email: string; is_staff: boolean; is_test: boolean }[]).map((s) => [
      s.email.toLowerCase(),
      s,
    ]),
  );
  const usedToken = new Set(
    ((invites ?? []) as { token: string; used_at: string | null }[]).filter((i) => i.used_at).map((i) => i.token),
  );
  const enrolledIds = new Set(((enrollments ?? []) as { student_id: string }[]).map((e) => e.student_id));
  const pageBySlug = new Map(
    ((pages ?? []) as { slug: string; headline: string | null; published: boolean }[]).map((p) => [p.slug, p]),
  );
  const pageTitle = (slug: string) => pageBySlug.get(slug)?.headline?.replace(/\s*\n\s*/g, " ").trim() || `/bcc/${slug}`;

  const stageOf = (r: SignupRow): { stage: Stage; internal: boolean } => {
    const s = studentByEmail.get(r.email.toLowerCase());
    const internal = !!(s && (s.is_staff || s.is_test));
    if (s && enrolledIds.has(s.id)) return { stage: "enrolled", internal };
    if (r.invite_token && usedToken.has(r.invite_token)) return { stage: "tapped-link", internal };
    return { stage: "signed-up", internal };
  };

  const staged = rows.map((r) => ({ r, ...stageOf(r) }));
  const real = staged.filter((x) => !x.internal);
  const enrolled = real.filter((x) => x.stage === "enrolled").length;
  const tapped = real.filter((x) => x.stage !== "signed-up").length;
  const pending = real.filter((x) => x.stage === "signed-up").length;
  const internalCount = staged.length - real.length;
  const pct = real.length ? Math.round((enrolled / real.length) * 100) : 0;
  const thisPage = pageSlug ? pageBySlug.get(pageSlug) : undefined;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const origin = "https://bccacademy.io";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={pageSlug ? `${pageTitle(pageSlug)} — signups` : "Landing page signups"}
        subtitle={
          pageSlug
            ? `${real.length} signed up · ${tapped} tapped their link · ${enrolled} enrolled (${pct}%)` +
              (pending > 0 ? ` · ${pending} still to chase` : "")
            : "No landing-page signups yet."
        }
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />

      {/* Landing-page picker — one page at a time. Appears once two pages have signups. */}
      {pageSlugsAll.length > 1 && (
        <nav aria-label="Landing page" className="flex flex-wrap gap-2">
          {pageSlugsAll.map((slug) => {
            const n = all.filter((r) => r.slug === slug).length;
            const active = slug === pageSlug;
            return (
              <Link
                key={slug}
                href={`/dashboard/admin/landing-signups?page=${encodeURIComponent(slug)}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium tabular-nums transition-colors ${
                  active
                    ? "bg-ink text-white"
                    : "border border-rule text-ink-soft hover:bg-paper-tint hover:text-ink"
                }`}
              >
                {pageTitle(slug)} <span className={active ? "text-white/70" : "text-ink-faint"}>{n}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {pageSlug && (
        <>
          <p className="text-xs text-ink-faint">
            <a href={`/bcc/${pageSlug}`} target="_blank" rel="noopener noreferrer" className="font-mono text-ink-soft hover:underline">
              /bcc/{pageSlug}
            </a>
            {thisPage && !thisPage.published && (
              <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-micro font-semibold text-neutral-600">unpublished</span>
            )}
            {course && (
              <>
                {" · enrolls into "}
                <Link href={`/dashboard/admin?tab=${encodeURIComponent(course)}&view=students`} className="font-medium text-primary hover:underline">
                  {courseName}
                </Link>
              </>
            )}
            {internalCount > 0 && ` · ${internalCount} internal test${internalCount === 1 ? "" : "s"} shown but not counted`}
          </p>

          <DataTable columns={["Name", "Email", "Signed up", "Status", ""]}>
            {staged.map(({ r, stage, internal }) => (
              <tr key={r.id} className={internal ? "text-ink-faint" : "text-ink"}>
                <td className="px-4 py-3 align-top font-medium">
                  {r.name?.trim() || <span className="text-ink-faint">—</span>}
                  {internal && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-micro font-semibold text-neutral-600">
                      internal
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm">{r.email}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-soft whitespace-nowrap">{fmt(r.created_at)}</td>
                <td className="px-4 py-3 align-top">
                  {stage === "enrolled" ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-micro font-semibold text-green-800">Enrolled</span>
                  ) : stage === "tapped-link" ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-micro font-semibold text-blue-800">Tapped link</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-micro font-semibold text-amber-800">Signed up</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  {stage !== "enrolled" && r.invite_token && (
                    <CopyLinkButton url={`${origin}/invite/${r.invite_token}`} title="Copy their one-click link" />
                  )}
                </td>
              </tr>
            ))}
          </DataTable>

          <p className="text-xs leading-relaxed text-ink-faint">
            Every signup is allowlisted and emailed a one-click link immediately.
            &ldquo;Signed up&rdquo; = hasn&apos;t used it yet (copy their link to nudge them).
            &ldquo;Tapped link&rdquo; = signed in but not on the roster. &ldquo;Enrolled&rdquo; = on the roster.
          </p>
        </>
      )}
    </div>
  );
}
