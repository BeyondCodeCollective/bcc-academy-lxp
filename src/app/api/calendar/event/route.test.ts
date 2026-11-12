import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const call = (qs: string) => GET(new NextRequest(`https://bccacademy.io/api/calendar/event${qs}`));
const q = (o: Record<string, string>) => "?" + new URLSearchParams(o).toString();

describe("/api/calendar/event .ics", () => {
  it("400s without start", async () => {
    expect((await call("")).status).toBe(400);
  });

  it("renders a timed VEVENT with CRLF lines and a 1h default end", async () => {
    const res = await call(q({ title: "Class", start: "2026-11-12T16:00:00Z" }));
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(body).toContain("DTSTART:20261112T160000Z");
    expect(body).toContain("DTEND:20261112T170000Z");
    expect(body).toContain("SUMMARY:Class");
  });

  it("escapes commas, semicolons, backslashes and newlines in text fields", async () => {
    const body = await (await call(q({ start: "2026-11-12T16:00:00Z", title: "a,b;c\\d", details: "x\ny", location: "r;1" }))).text();
    expect(body).toContain(String.raw`SUMMARY:a\,b\;c\\d`);
    expect(body).toContain(String.raw`DESCRIPTION:x\ny`);
    expect(body).toContain(String.raw`LOCATION:r\;1`);
  });
});
