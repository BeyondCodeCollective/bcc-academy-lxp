"use server";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Upload endpoint for files attached to a PUBLIC application form.
 *
 * Everything here assumes the caller is a stranger, because on a public apply
 * page they are. Nothing the browser sends is trusted:
 *
 *  · the extension is checked against an allowlist,
 *  · the MIME type is checked against an allowlist,
 *  · the first bytes are checked to match the claimed type, so a renamed
 *    script can't arrive as "resume.pdf",
 *  · the size is capped server-side (the bucket caps it too — belt and braces),
 *  · the stored filename is generated here, never taken from the client, so a
 *    crafted name can't traverse paths or collide with someone else's file.
 *
 * The bucket is private. This returns a storage PATH, not a URL — the path is
 * what lands in the survey response. Staff get a short-lived signed URL later
 * via getApplicationFileUrl.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** extension → [allowed MIME types, magic-byte prefixes] */
const ALLOWED: Record<string, { mimes: string[]; magic: number[][] }> = {
  // %PDF
  pdf: { mimes: ["application/pdf"], magic: [[0x25, 0x50, 0x44, 0x46]] },
  // .doc is an OLE compound file: D0 CF 11 E0
  doc: {
    mimes: ["application/msword"],
    magic: [[0xd0, 0xcf, 0x11, 0xe0]],
  },
  // .docx is a zip: PK\x03\x04
  docx: {
    mimes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    magic: [[0x50, 0x4b, 0x03, 0x04]],
  },
};

export const ACCEPTED_UPLOAD_EXTENSIONS = Object.keys(ALLOWED);
export const MAX_UPLOAD_BYTES = MAX_BYTES;

export type UploadResult =
  | { ok: true; path: string; name: string; size: number }
  | { ok: false; error: string };

export async function uploadApplicationFile(
  formData: FormData,
): Promise<UploadResult> {
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "").trim();

  if (!(file instanceof File)) return { ok: false, error: "No file received." };
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That file is larger than 5 MB." };
  }
  // The folder is chosen here from a fixed list — never from client input, which
  // is what would otherwise let a caller write anywhere in the bucket.
  const folder = kind === "home-for-summer" ? "home-for-summer" : null;
  if (!folder) return { ok: false, error: "Unknown upload type." };

  const originalName = file.name || "upload";
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  const rule = ALLOWED[ext];
  if (!rule) {
    return { ok: false, error: "Please upload a PDF or Word document." };
  }
  if (file.type && !rule.mimes.includes(file.type)) {
    return { ok: false, error: "That file type doesn't match its extension." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const matches = rule.magic.some((sig) =>
    sig.every((b, i) => bytes[i] === b),
  );
  if (!matches) {
    return {
      ok: false,
      error: "That doesn't look like a real PDF or Word document.",
    };
  }

  const svc = createServiceClient();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await svc.storage
    .from("resumes")
    .upload(path, bytes, {
      contentType: rule.mimes[0],
      upsert: false,
    });

  if (error) {
    console.error("[apply-upload] failed", { folder, error });
    return { ok: false, error: "Upload failed. Please try again." };
  }

  // The original filename travels back for display only — it is never used to
  // build a path.
  return { ok: true, path, name: originalName, size: file.size };
}
