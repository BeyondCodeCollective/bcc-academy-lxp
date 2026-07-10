import { Eye } from "@phosphor-icons/react/dist/ssr";
import { getSessionContext } from "@/lib/auth/session";
import { getPreviewTrackSlug, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { getProgram } from "@/lib/programs/server";
import { setPreviewTrackSlug } from "@/app/dashboard/preview-actions";

/**
 * Impossible-to-miss strip across the top while a super-admin is previewing
 * as a student. The corner eye toggle was the only indicator, and preview
 * survives 8 hours — long enough to forget it's on and wonder why Home keeps
 * landing on a course you never picked (it got Fonz on 2026-07-10).
 */
export async function PreviewBanner() {
  const ctx = await getSessionContext();
  const slug = await getPreviewTrackSlug(ctx?.student?.role ?? "");
  if (!slug) return null;

  let name: string;
  if (slug === LUNCH_LEARN_PREVIEW_SLUG) {
    name = "Lunch & Learns";
  } else {
    const program = await getProgram();
    name = program.tracks.find((t) => t.slug === slug)?.name ?? slug;
  }

  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 bg-primary px-4 py-2 text-white sm:px-6">
      <Eye size={15} weight="bold" aria-hidden className="shrink-0" />
      <p className="min-w-0 flex-1 truncate text-[13px]">
        Previewing as a student enrolled in <strong className="font-semibold">{name}</strong>
      </p>
      <form action={setPreviewTrackSlug.bind(null, null)}>
        <button
          type="submit"
          className="shrink-0 rounded-full border border-white/40 px-3 py-1 text-[12px] font-semibold transition-colors hover:bg-white/10"
        >
          Exit preview
        </button>
      </form>
    </div>
  );
}
