import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ email: vi.fn(), staff: vi.fn(), upload: vi.fn(), list: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/email", () => ({ sendCertificateEmail: mocks.email, sendCertificatePdfToStaff: mocks.staff }));
vi.mock("@/lib/google-drive", () => ({ uploadPdfToDrive: mocks.upload, listDriveFileNames: mocks.list }));
vi.mock("./data", () => ({
  loadCertificate: async (id: string) => ({
    id, studentName: "Ada Lovelace", trackName: "Foundations of AI & Digital Skills",
    programLine: "10-week program · Ashley Morgan", programName: "Upskill Bahamas",
    orgName: "Beyond Code Collective", primaryColor: "#1a1a1a",
    completedDate: "October 7, 2026", completedYear: "2026",
  }),
}));

import { autoIssueIfFinished, sweepAutoCertificates } from "./auto";
import { certificateFileName, renderCertificatePdf } from "./pdf";

type Row = Record<string, unknown>;

/** Just enough of the Supabase query builder for auto.ts, over in-memory tables. */
function fakeSvc(tables: Record<string, Row[]>) {
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    let inserted: Row | null = null;
    const q = {
      select: () => q,
      eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), q),
      in: (c: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[c]))), q),
      not: (c: string) => ((rows = rows.filter((r) => r[c] != null)), q),
      insert: (row: Row) => {
        inserted = { ...row, certificate_id: `cert-${String(row.student_id)}-0000` };
        (tables[table] ??= []).push(inserted);
        return q;
      },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => ({ data: inserted ?? rows[0] ?? null, error: null }),
      then: (ok: (v: { data: Row[]; error: null }) => unknown) => ok({ data: rows, error: null }),
    };
    return q;
  };
  return { from } as never;
}

const allTen = (uid: string) =>
  Array.from({ length: 10 }, (_, i) => ({ user_id: uid, track_slug: "ai-literacy", week_number: i + 1, video_watched_at: "x" }));

function forte(extra: Partial<Record<string, Row[]>> = {}) {
  return {
    programs: [{ id: "p-forte", slug: "forte" }],
    students: [
      { id: "done", role: "student", is_staff: false, is_test: false, first_name: "Ada", email: "ada@example.com" },
      { id: "nine", role: "student", is_staff: false, is_test: false, first_name: "Bo", email: "bo@example.com" },
      { id: "staff", role: "admin", is_staff: true, is_test: false, first_name: "St", email: "st@example.com" },
    ],
    student_tracks: ["done", "nine", "staff"].map((s) => ({ student_id: s, program_id: "p-forte", track_slug: "ai-literacy" })),
    week_progress: [...allTen("done"), ...allTen("nine").slice(0, 9), ...allTen("staff")],
    track_completions: [] as Row[],
    ...extra,
  } as Record<string, Row[]>;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CERTIFICATES_DRIVE_FOLDER_ID = "folder";
  delete process.env.CERTIFICATE_NOTIFY_EMAIL;
  mocks.upload.mockResolvedValue({ ok: true, fileId: "f" });
  mocks.list.mockResolvedValue([]);
});

describe("autoIssueIfFinished", () => {
  it("issues, emails and files once the 10th video is watched", async () => {
    const t = forte();
    await autoIssueIfFinished(fakeSvc(t), "done", "ai-literacy");
    expect(t.track_completions).toHaveLength(1);
    expect(mocks.email).toHaveBeenCalledWith(expect.objectContaining({ to: "ada@example.com", programName: "Upskill Bahamas" }));
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it("emails the PDF to staff when CERTIFICATE_NOTIFY_EMAIL is set, and skips Drive when no folder is set", async () => {
    process.env.CERTIFICATE_NOTIFY_EMAIL = "staff@example.com";
    delete process.env.CERTIFICATES_DRIVE_FOLDER_ID;
    const t = forte();
    await autoIssueIfFinished(fakeSvc(t), "done", "ai-literacy");
    expect(mocks.staff).toHaveBeenCalledWith(
      expect.objectContaining({ to: "staff@example.com", studentName: "Ada Lovelace", fileName: expect.stringMatching(/\.pdf$/) }),
    );
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("sends no staff copy when it is not configured", async () => {
    await autoIssueIfFinished(fakeSvc(forte()), "done", "ai-literacy");
    expect(mocks.staff).not.toHaveBeenCalled();
  });

  it("does nothing at 9 of 10, for staff, or for a track that does not opt in", async () => {
    const t = forte();
    await autoIssueIfFinished(fakeSvc(t), "nine", "ai-literacy");
    await autoIssueIfFinished(fakeSvc(t), "staff", "ai-literacy");
    await autoIssueIfFinished(fakeSvc(t), "done", "some-other-track");
    expect(t.track_completions).toHaveLength(0);
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it("never emails a learner who already holds the certificate", async () => {
    const t = forte({ track_completions: [{ student_id: "done", track_slug: "ai-literacy", program_id: "p-forte", certificate_id: "old" }] });
    await autoIssueIfFinished(fakeSvc(t), "done", "ai-literacy");
    expect(t.track_completions).toHaveLength(1);
    expect(mocks.email).not.toHaveBeenCalled();
  });
});

describe("sweepAutoCertificates", () => {
  it("files certificates missing from Drive, skipping ones already there and ones it just issued", async () => {
    const t = forte({
      track_completions: [
        { student_id: "x", track_slug: "ai-literacy", program_id: "p-forte", certificate_id: "aaaaaaaa-1" },
        { student_id: "y", track_slug: "ai-literacy", program_id: "p-forte", certificate_id: "bbbbbbbb-2" },
      ],
    });
    mocks.list.mockResolvedValue(["Someone - Course (aaaaaaaa).pdf"]);
    const res = await sweepAutoCertificates(fakeSvc(t));
    expect(res).toEqual({ issued: 1, filed: 1, errors: [] });
    // One upload for the newly issued certificate, one for bbbbbbbb; none for aaaaaaaa.
    expect(mocks.upload).toHaveBeenCalledTimes(2);
  });
});

describe("certificate PDF", () => {
  it("renders a PDF and names the file with the certificate id", async () => {
    const c = {
      id: "da90f975-7257", studentName: "Travis Kemp", trackName: "Foundations of AI & Digital Skills",
      programLine: "10-week program · Ashley Morgan", programName: "Upskill Bahamas",
      orgName: "Beyond Code Collective", primaryColor: "#1a1a1a", completedDate: "October 7, 2026", completedYear: "2026",
    };
    const pdf = await renderCertificatePdf(c);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(certificateFileName(c)).toBe("Travis Kemp - Foundations of AI & Digital Skills (da90f975).pdf");
  });
});
