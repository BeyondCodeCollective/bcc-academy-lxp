import { describe, expect, it } from "vitest";
import {
  buildDigests,
  changedFields,
  digestText,
  listPhrase,
  SESSION_FIELD_LABELS,
  truncate,
  type PendingChange,
} from "./ta-changes";

describe("changedFields", () => {
  it("lists only fields whose value changed", () => {
    const prev = { title: "Week 1", meeting_link: "https://zoom.us/j/1", homework_instructions: null };
    const next = { title: "Week 1", meeting_link: "https://zoom.us/j/2", homework_instructions: "Read ch. 2" };
    expect(changedFields(prev, next, SESSION_FIELD_LABELS)).toEqual(["Zoom link", "homework instructions"]);
  });

  it("treats null, empty string and empty list as the same", () => {
    expect(changedFields({ title: null, resources: [] }, { title: "", resources: [] }, SESSION_FIELD_LABELS)).toEqual([]);
  });

  it("ignores fields the save didn't send", () => {
    expect(changedFields({ title: "A", subtitle: "x" }, { title: "A" }, SESSION_FIELD_LABELS)).toEqual([]);
  });

  it("counts every sent field as changed when there was no row before", () => {
    expect(changedFields(null, { title: "New" }, SESSION_FIELD_LABELS)).toEqual(["title"]);
  });

  it("compares structured values", () => {
    const prev = { resources: [{ title: "A" }] };
    expect(changedFields(prev, { resources: [{ title: "B" }] }, SESSION_FIELD_LABELS)).toEqual(["resources"]);
  });
});

describe("listPhrase and truncate", () => {
  it("joins naturally", () => {
    expect(listPhrase(["a"])).toBe("a");
    expect(listPhrase(["a", "b"])).toBe("a and b");
    expect(listPhrase(["a", "b", "c"])).toBe("a, b and c");
  });

  it("truncates long text on one line", () => {
    expect(truncate("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
    expect(truncate("a\n\nb")).toBe("a b");
  });
});

const change = (id: string, track: string, at: string, actor = "Sam TA"): PendingChange => ({
  id,
  track_slug: track,
  summary: `change ${id}`,
  created_at: at,
  actor_name: actor,
});

describe("buildDigests", () => {
  const lead = { email: "Lead@x.org", name: "Lee Lead" };
  const other = { email: "other@x.org", name: "Ola Other" };
  const name = (slug: string) => `Course ${slug}`;

  it("sends each lead only their own courses, oldest first", () => {
    const digests = buildDigests(
      [change("2", "a", "2026-11-04T10:00Z"), change("1", "a", "2026-11-04T09:00Z"), change("3", "b", "2026-11-04T11:00Z")],
      new Map([["a", [lead]], ["b", [other]]]),
      name,
    );
    expect(digests).toHaveLength(2);
    const forLead = digests.find((d) => d.recipient.email === lead.email)!;
    expect(forLead.courses.map((c) => c.courseName)).toEqual(["Course a"]);
    expect(forLead.courses[0].items.map((i) => i.id)).toEqual(["1", "2"]);
    expect(forLead.changeIds).toEqual(["1", "2"]);
  });

  it("merges a lead's courses into one digest, matching email case-insensitively", () => {
    const digests = buildDigests(
      [change("1", "a", "2026-11-04T09:00Z"), change("2", "b", "2026-11-04T09:00Z")],
      new Map([["a", [lead]], ["b", [{ ...lead, email: "lead@X.org" }]]]),
      name,
    );
    expect(digests).toHaveLength(1);
    expect(digests[0].courses).toHaveLength(2);
  });

  it("skips changes on a course with no recipients", () => {
    expect(buildDigests([change("1", "orphan", "2026-11-04T09:00Z")], new Map(), name)).toEqual([]);
  });

  it("renders a readable text body", () => {
    const [d] = buildDigests([change("1", "a", "2026-11-04T09:00Z")], new Map([["a", [lead]]]), name);
    const text = digestText(d, "https://bccacademy.io/dashboard/admin");
    expect(text).toContain("Hi Lee, your teaching assistant made 1 change since the last recap.");
    expect(text).toContain("Course a\n• Sam TA: change 1");
  });
});
