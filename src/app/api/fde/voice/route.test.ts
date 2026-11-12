import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({ put: vi.fn() }));
vi.mock("@/lib/blob-recordings", () => ({ signRecordingUrl: vi.fn() }));
const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => true,
  createClient: async () => ({ auth: { getUser } }),
}));

import { GET, POST } from "./route";

const fetchMock = vi.fn();
const audio = () => new Response(new Uint8Array([1, 2, 3]), { status: 200 });
let n = 0;
const unique = () => `line ${Date.now()} ${n++}`;
const get = (text: string, p = "") => GET(new Request(`https://bccacademy.io/api/fde/voice?text=${encodeURIComponent(text)}${p}`));

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
  fetchMock.mockReset().mockImplementation(async () => audio());
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("ELEVENLABS_API_KEY", "k");
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("/api/fde/voice", () => {
  it("503s when the key is not configured", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect((await get("hi")).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400s on empty or non-string text and 413s over 1200 chars", async () => {
    expect((await get("   ")).status).toBe(400);
    const bad = await POST(new Request("https://x/api/fde/voice", { method: "POST", body: JSON.stringify({ text: 5 }) }));
    expect(bad.status).toBe(400);
    const junk = await POST(new Request("https://x/api/fde/voice", { method: "POST", body: "{nope" }));
    expect(junk.status).toBe(400);
    expect((await get("a".repeat(1201))).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("buys a line once, then serves it from memory with a shared immutable cache", async () => {
    const t = unique();
    const first = await get(t);
    expect(first.headers.get("x-fde-cache")).toBe("miss");
    expect(first.headers.get("cache-control")).toContain("immutable");
    const second = await get(t);
    expect(second.headers.get("x-fde-cache")).toBe("memory");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps personalized lines out of shared caches", async () => {
    const res = await get(unique(), "&p=1");
    expect(res.headers.get("cache-control")).toBe("private, max-age=86400");
  });

  it("502s when ElevenLabs fails", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    expect((await get(unique())).status).toBe(502);
  });

  it("requires a signed-in session on GET and POST", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await get(unique())).status).toBe(401);
    const post = await POST(new Request("https://x/api/fde/voice", { method: "POST", body: JSON.stringify({ text: unique() }) }));
    expect(post.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
