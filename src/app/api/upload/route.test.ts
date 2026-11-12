import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  configured: true,
  user: { id: "u1" } as { id: string } | null,
  role: "admin" as string | undefined,
  upload: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => mocks.configured,
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }),
  createServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: mocks.role ? { role: mocks.role } : null }) }) }) }),
    storage: { from: () => ({ upload: mocks.upload }) },
  }),
}));

import { POST } from "./route";

function req(fields: Record<string, unknown>, formDataFails = false) {
  const fd = new Map(Object.entries(fields));
  return {
    formData: async () => {
      if (formDataFails) throw new Error("bad");
      return { get: (k: string) => fd.get(k) ?? null };
    },
  } as unknown as NextRequest;
}
const file = (name = "a b.pdf", type = "application/pdf") => new File(["x"], name, { type });
const good = () => ({ file: file(), track: "mass", week: "3" });

beforeEach(() => {
  mocks.configured = true;
  mocks.user = { id: "u1" };
  mocks.role = "admin";
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/api/upload", () => {
  it("503 unconfigured, 401 anonymous, 403 student or unknown role, never uploading", async () => {
    mocks.configured = false;
    expect((await POST(req(good()))).status).toBe(503);
    mocks.configured = true;
    mocks.user = null;
    expect((await POST(req(good()))).status).toBe(401);
    mocks.user = { id: "u1" };
    mocks.role = "student";
    expect((await POST(req(good()))).status).toBe(403);
    mocks.role = undefined;
    expect((await POST(req(good()))).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("400s on bad form data, missing file, bad track, bad week", async () => {
    expect((await POST(req({}, true))).status).toBe(400);
    expect((await POST(req({ ...good(), file: "not a file" }))).status).toBe(400);
    expect((await POST(req({ ...good(), track: "../etc" }))).status).toBe(400);
    expect((await POST(req({ ...good(), week: "abc" }))).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("413s a file over 50 MB", async () => {
    const big = file();
    Object.defineProperty(big, "size", { value: 50 * 1024 * 1024 + 1 });
    expect((await POST(req({ ...good(), file: big }))).status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("sanitizes the filename into a track/week scoped path and returns the public URL", async () => {
    const res = await POST(req({ ...good(), file: file("../../my file (1).pdf") }));
    const body = await res.json();
    const path = mocks.upload.mock.calls[0][0] as string;
    expect(path).toMatch(/^mass\/3\/\d+_\.{2}_\.{2}_my_file__1_\.pdf$/);
    expect(path).not.toContain("/..");
    expect(body.url).toBe(`https://proj.supabase.co/storage/v1/object/public/session-files/${path}`);
  });

  it("forces active content types to octet-stream (stored XSS guard)", async () => {
    for (const t of ["text/html", "image/svg+xml", "application/xml", "text/javascript"]) {
      mocks.upload.mockClear();
      await POST(req({ ...good(), file: file("x.bin", t) }));
      expect(mocks.upload.mock.calls[0][2].contentType).toBe("application/octet-stream");
    }
    mocks.upload.mockClear();
    await POST(req(good()));
    expect(mocks.upload.mock.calls[0][2].contentType).toBe("application/pdf");
  });

  it("500s with the storage error message", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "bucket gone" } });
    const res = await POST(req(good()));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("bucket gone");
  });
});
