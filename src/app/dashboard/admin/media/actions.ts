"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";
import { tagPhoto } from "@/lib/media-library";

// Same tier as landing pages: the library feeds public marketing pages across
// every program, so it sits with super-admins.
async function requireLibrarian() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (!canSwitchPrograms(student?.role ?? "")) throw new Error("Not authorized");
  return svc;
}

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Upload one photo: store it in the landing bucket, AI-caption it, index it.
 *  The client loops over files calling this once each, so one bad photo in a
 *  pack fails alone. */
export async function uploadLibraryPhotoAction(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const svc = await requireLibrarian();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a photo first." };
  }
  const ext = TYPES[file.type];
  if (!ext) return { success: false, error: `${file.name}: use JPG, PNG, or WebP.` };
  if (file.size > 12 * 1024 * 1024) {
    return { success: false, error: `${file.name} is over 12MB.` };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `library/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await svc.storage
    .from("landing")
    .upload(path, buf, { contentType: file.type });
  if (uploadError) {
    console.error("[uploadLibraryPhotoAction] upload failed:", uploadError);
    return { success: false, error: `${file.name}: upload failed.` };
  }
  const url = svc.storage.from("landing").getPublicUrl(path).data.publicUrl;

  // Caption failures shouldn't lose the photo — it's already stored; an
  // untagged photo just matches poorly until re-tagged.
  let description: string | null = null;
  let tags: string[] = [];
  try {
    const tagged = await tagPhoto(buf, file.type);
    description = tagged.description;
    tags = tagged.tags;
  } catch (err) {
    console.error("[uploadLibraryPhotoAction] tagging failed:", err);
  }

  const { error: insertError } = await svc.from("media_library").insert({
    url,
    path,
    source: "dts",
    description,
    tags,
  });
  if (insertError) {
    console.error("[uploadLibraryPhotoAction] index failed:", insertError);
    await svc.storage.from("landing").remove([path]);
    return { success: false, error: `${file.name}: could not be indexed.` };
  }

  revalidatePath("/dashboard/admin/media");
  return { success: true, url };
}

export async function deleteLibraryPhotoAction(
  id: string,
): Promise<{ success: boolean }> {
  const svc = await requireLibrarian();
  const { data } = await svc
    .from("media_library")
    .select("path")
    .eq("id", id)
    .single<{ path: string }>();
  if (data) {
    // Pages already using the photo keep working until the file is gone, so
    // remove the index row first, then the file.
    await svc.from("media_library").delete().eq("id", id);
    await svc.storage.from("landing").remove([data.path]);
  }
  revalidatePath("/dashboard/admin/media");
  return { success: true };
}
