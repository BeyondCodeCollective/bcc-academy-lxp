import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel, canAccessStaffContent } from "@/lib/roles";
import { toDriveEmbedUrl } from "@/lib/lunch-learns/drive";

export const dynamic = "force-dynamic";

export default async function LunchLearnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  const role = ctx.student?.role ?? "";
  const email = ctx.student?.email ?? ctx.userEmail ?? null;
  if (!canAccessStaffContent(role, email, ctx.student?.is_staff)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const svc = createServiceClient();
  const { data: recording } = await svc
    .from("lunch_learns")
    .select("id, title, presenter, recorded_at, recording_url, description")
    .eq("id", id)
    .maybeSingle();

  if (!recording) notFound();

  const isAdmin = canAccessAdminPanel(role);
  const embedUrl = toDriveEmbedUrl(recording.recording_url);

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-4xl px-4 sm:px-5 py-10 md:py-14">
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-3">
          {new Date(recording.recorded_at).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold text-ink tracking-[-0.02em] leading-[1.05]">
          {recording.title}
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          with {recording.presenter}
        </p>
      </header>

      {embedUrl ? (
        <div className="relative w-full overflow-hidden bg-ink" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={embedUrl}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            title={recording.title}
          />
        </div>
      ) : (
        <div className="border border-rule-soft bg-paper-tint-soft p-6 text-center">
          <p className="text-[14px] text-ink-soft">
            This recording can&rsquo;t be embedded.
          </p>
          <a
            href={recording.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 bg-ink text-paper text-[13px] font-semibold px-4 py-2.5 transition-colors hover:bg-ink-soft"
          >
            Open in Google Drive
          </a>
        </div>
      )}

      {recording.description && (
        <div className="mt-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-3">
            About this session
          </p>
          <p className="text-[15px] leading-[1.65] text-ink whitespace-pre-line">
            {recording.description}
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="mt-10 border-t border-rule-soft pt-6">
          <Link
            href="/dashboard/admin?tab=lunch-learn"
            className="text-[13px] text-ink-soft hover:text-ink"
          >
            Manage recordings &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
