import { beforeEach, describe, expect, it, vi } from "vitest";

// Probes the exported "use server" actions the way a hostile client can: with
// arguments the TypeScript signature would forbid, and with ids that belong to
// another program. requireManager/requireAdmin are stubbed to a program-A admin;
// the service client records every write.
type Write = { table: string; op: string; payload: unknown; filters: Record<string, unknown> };
const st = vi.hoisted(() => ({
  writes: [] as Write[],
  rows: {} as Record<string, Record<string, unknown> | null>,
  session: null as null | { userId: string; role: string; programId: string | null },
  studentGuard: "ok" as "ok" | "deny",
  trackEnrolled: [] as string[],
}));

function makeSvc() {
  return {
    from(table: string) {
      let op = "select";
      let payload: unknown;
      const filters: Record<string, unknown> = {};
      const q: Record<string, unknown> = {};
      const chain = () => q;
      for (const m of ["select", "order", "limit", "is", "or", "in"]) q[m] = chain;
      q.eq = (c: string, v: unknown) => {
        filters[c] = v;
        return q;
      };
      for (const m of ["insert", "update", "upsert", "delete"]) {
        q[m] = (p?: unknown) => {
          op = m;
          payload = p;
          return q;
        };
      }
      const done = () => {
        if (op !== "select") st.writes.push({ table, op, payload, filters: { ...filters } });
        return { data: st.rows[table] ?? null, error: null };
      };
      q.maybeSingle = async () => done();
      q.single = async () => done();
      q.then = (ok: (v: unknown) => unknown) => Promise.resolve(done()).then(ok);
      return q;
    },
  };
}

const actor = () => ({ svc: makeSvc(), userId: "admin-1", role: "admin", programId: "progA", isMaster: false, grants: [] });

vi.mock("./actions-shared", () => ({
  requireManager: async () => actor(),
  requireAdmin: async () => actor(),
  requireCapability: async () => actor(),
  assertStudentInActorProgram: async () => {
    if (st.studentGuard === "deny") throw new Error("Not authorized for this student");
  },
  assertTrackInActorProgram: async () => {},
  resolveProgramForActor: async () => "progA",
  logAdminAccess: () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn }));
vi.mock("@/lib/mailchimp", () => ({ subscribeToNewsletter: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notifyAnnouncement: vi.fn(), notifyFeedback: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendCertificateEmail: vi.fn() }));
vi.mock("@/lib/analytics/log-event", () => ({ logActivityEvent: vi.fn() }));
vi.mock("@/lib/ta-changes", () => ({
  learnerName: async () => "x",
  recordIfAssistant: async () => {},
  truncate: (s: string) => s,
}));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: async () => st.session }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => makeSvc(), createClient: async () => makeSvc() }));
vi.mock("@/lib/programs/server", () => ({
  getProgramId: async () => "progA",
  resolveTrackProgram: async () => ({ program: { slug: "catalyst" } }),
  getProgram: async () => ({ slug: "catalyst" }),
}));

import { updateStudentAction } from "./actions-students";
import { addFeedback } from "./actions-misc";
import { getAllSessionContent, getSessionContent } from "./actions-tracks";

const lastWrite = (table: string) => st.writes.filter((w) => w.table === table).at(-1);

beforeEach(() => {
  st.writes = [];
  st.rows = {};
  st.session = null;
  st.studentGuard = "ok";
});

describe("updateStudentAction", () => {
  it("allows a name change", async () => {
    await updateStudentAction("s1", "first_name", "  Ada ");
    expect(lastWrite("students")?.payload).toEqual({ first_name: "Ada" });
  });

  it("refuses a student outside the actor's program", async () => {
    st.studentGuard = "deny";
    await expect(updateStudentAction("s1", "first_name", "Ada")).rejects.toThrow("Not authorized");
    expect(st.writes).toHaveLength(0);
  });

  it("never lets an admin set a role at or above their own", async () => {
    st.rows.students = { role: "student" };
    await expect(updateStudentAction("s1", "role", "super_admin")).rejects.toThrow("permission");
    await expect(updateStudentAction("admin-1", "role", "student")).rejects.toThrow("own role");
  });
});

describe("announcement and feedback scoping", () => {
  it("addFeedback requires a submission or reflection id", async () => {
    await expect(addFeedback({ comment: "x" })).rejects.toThrow("Must provide");
  });
});

describe("session content read gates", () => {
  const row = { id: "sc1", track: "secret-track", week_number: 1, meeting_link: "https://zoom.example.test/j/1" };

  it("returns nothing to an anonymous caller", async () => {
    st.rows.session_content = row;
    expect(await getSessionContent("secret-track", 1)).toBeNull();
    expect(await getAllSessionContent("secret-track")).toEqual([]);
  });
});
