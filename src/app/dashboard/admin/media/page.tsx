import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { listLibraryPhotos } from "@/lib/media-library";
import { ManageMenu } from "../manage-menu";
import { MediaLibraryClient } from "./media-library-client";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const photos = await listLibraryPhotos(createServiceClient());

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Photo library"
        subtitle="Licensed photos (Death to Stock packs) the course builder picks hero images from automatically. Each photo is AI-captioned on upload; the best match is set when a course and its landing page are created."
        noWrap
        actions={<ManageMenu />}
      />
      <MediaLibraryClient photos={photos} />
    </div>
  );
}
