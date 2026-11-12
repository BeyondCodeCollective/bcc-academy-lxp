import { test, expect } from "./support/test";

// Unauthenticated probes against the LOCAL server only. No cookies are sent.
const NO_DATA = (b: string) => expect(b).not.toMatch(/"email"|"first_name"|"student_id"|"recording_url"/);

const GETS: [string, number[]][] = [
  ["/api/week-progress", [401]],
  ["/api/session-content?track=mass", [401]],
  ["/api/instructor", [401, 404, 405]],
  ["/api/insights/csv", [401, 403, 307, 302]],
  ["/api/insights/pdf", [401, 403, 307, 302]],
  ["/api/admin/exit-surveys/csv", [401, 403, 307, 302]],
  ["/api/locations/csv", [401, 403, 307, 302]],
  ["/api/mvp/export", [401, 403, 405, 307, 302]],
  ["/api/events", [200, 401, 403, 405]],
  ["/api/calendar/not-a-token", [401, 403, 404]],
];
const POSTS: [string, number[], unknown][] = [
  ["/api/upload", [401], {}],
  ["/api/tutor", [401], { messages: [] }],
  ["/api/attendance", [401], { track_slug: "mass", week_number: 1, student_id: "x" }],
  ["/api/instructor", [401], { track: "mass", week: 1 }],
  ["/api/push/subscribe", [401, 400], {}],
  ["/api/quiz/results", [200, 400, 401, 422], {}],
];

test.describe("unauthenticated API probes", () => {
  for (const [url, ok] of GETS) {
    test(`GET ${url}`, async ({ request }) => {
      const r = await request.get(url, { maxRedirects: 0 });
      expect(ok, `${url} -> ${r.status()}`).toContain(r.status());
      if (r.status() >= 400) NO_DATA(await r.text());
    });
  }
  for (const [url, ok, body] of POSTS) {
    test(`POST ${url}`, async ({ request }) => {
      const r = await request.post(url, { data: body as object, maxRedirects: 0 });
      expect(ok, `${url} -> ${r.status()}`).toContain(r.status());
      if (r.status() >= 400) NO_DATA(await r.text());
    });
  }

  test("dev-login is closed outside development", async ({ request }) => {
    const r = await request.post("/api/dev-login", { data: { email: "x@example.test" } });
    expect(r.status()).toBe(403);
  });

  test("csp-report sink accepts junk without erroring", async ({ request }) => {
    const r = await request.post("/api/csp-report", { data: "not json", headers: { "content-type": "application/csp-report" } });
    expect(r.status()).toBeLessThan(500);
  });
});
