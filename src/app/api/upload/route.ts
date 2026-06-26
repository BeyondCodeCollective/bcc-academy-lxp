import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { canAccessAdminPanel } from "@/lib/roles";

/**
 * POST /api/upload
 *
 * Accepts multipart FormData:
 *   - file:  the file to upload (required)
 *   - track: "mass" | "techplus" (required)
 *   - week:  week number as a string (required)
 *
 * Returns: { url: string, name: string }
 * Error:   { error: string }
 *
 * Auth: must be authenticated + have role = "admin".
 * Storage: uploads to the "session-files" bucket under {track}/{week}/{filename}.
 * Uses the service-role client for the upload so RLS bucket policies don't
 * block the insert (the admin check is done server-side here).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Admin role check ──────────────────────────────────────────────────────
  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (!canAccessAdminPanel(student?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse form data ───────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const track = formData.get("track");
  const week = formData.get("week");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!track || !["mass", "techplus"].includes(String(track))) {
    return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  }
  if (!week || isNaN(Number(week))) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  // ── File size guard (50 MB) ───────────────────────────────────────────────
  const MAX_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 50 MB." }, { status: 413 });
  }

  // ── Build storage path and upload ─────────────────────────────────────────
  // Sanitize the filename: replace spaces with underscores, strip path chars
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const storagePath = `${track}/${week}/${Date.now()}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Stored-XSS guard: the bucket is public, so a file served with an active
  // content type (HTML/SVG/XML/JS) would execute on the Supabase storage origin.
  // The service client bypasses the bucket's MIME allowlist, so neutralize here:
  // force any active type to octet-stream (downloads instead of rendering).
  const rawType = file.type || "application/octet-stream";
  const contentType = /html|svg|xml|javascript|ecmascript/i.test(rawType)
    ? "application/octet-stream"
    : rawType;

  const { error: uploadError } = await svc.storage
    .from("session-files")
    .upload(storagePath, uint8Array, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload] Supabase storage error:", uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // ── Build the public URL ──────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/session-files/${storagePath}`;

  return NextResponse.json({ url: publicUrl, name: file.name });
}
