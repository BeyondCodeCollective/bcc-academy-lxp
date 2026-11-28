import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./attendance-review-queries", () => ({ loadMvpAttendanceReviews: vi.fn(async () => []) }));
import { getMvpStartSlots } from "./start-sessions";
import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";
import { calculateMvpCoursePerformance } from "./course-performance";
import { loadLearnerAttendance } from "./learner-attendance";

type Track = NonNullable<MvpScheduleInput["track"]>;
const track: Track = { slug: "course", name: "Course", shortName: "Course", totalWeeks: 2,
  sessionsPerWeek: 3, unitLabel: "Week", startDate: "2026-10-01", lastSessionDayOffset: 0,
  weekSummaries: [{ week: 0, date: "2026-10-01", label: "Kickoff" },
    { week: 1, date: "2026-10-02" }, { week: 2, date: "2026-10-09" },
    { week: 3, date: "2026-10-16", label: "Exam" }] };
const asOf = new Date("2026-10-05T18:00:00Z");

describe("shared recorded-start mapping", () => {
  it.each([1, 2, 3])("maps kickoff and first slot with %i sessions per week", sessionsPerWeek => {
    expect(getMvpStartSlots({ ...track, sessionsPerWeek })?.map(s => [s.weekNumber, s.sessionNumber]))
      .toEqual([[0, 1], [1, 1]]);
  });
  it.each([
    { selfPaced: true }, { startDateTbd: true }, { sessionsPerWeek: 0 },
    { weekSummaries: [{ week: 1 }] },
    { weekSummaries: [{ week: 1, date: "2026-02-30" }] },
    { weekSummaries: [{ week: 1, date: "2026-10-01" }, { week: 1, date: "2026-10-02" }] },
    { weekSummaries: [{ week: 1, date: "2026-10-01" }, { week: 2, date: "2026-10-01" }] },
    { weekSummaries: [{ week: 1, date: "2026-10-01" }, { week: 0, date: "2026-10-02", label: "Kickoff" }] },
  ])("keeps unsupported or conflicting mappings unavailable: %j", override => {
    expect(getMvpStartSlots({ ...track, ...override })).toBeNull();
  });
  it.each([
    { week: 0, session: 1, date: asOf, expected: true },
    { week: 1, session: 1, date: asOf, expected: true },
    { week: 1, session: 2, date: asOf, expected: false },
    { week: 2, session: 1, date: asOf, expected: false },
    { week: 3, session: 1, date: asOf, expected: false },
    { week: 1, session: 1, date: new Date("2026-09-30T18:00Z"), expected: false },
  ])("agrees across aggregate and learner loaders for $week.$session at $date", async ({ week, session, date, expected }) => {
    const records = [{ id: "checkin", program_id: "p", student_id: "a", track: "course",
      week_number: week, session_number: session, checked_in_at: null }];
    // Minimal database adapter: honors the actual loader's tenant, learner and cursor predicates.
    const db = { from: () => {
      let rows = [...records];
      const query = {
        select: () => query, order: () => query, limit: () => query,
        eq: (key: string, value: unknown) => { rows = rows.filter(r => r[key as keyof typeof r] === value); return query; },
        in: (key: string, values: unknown[]) => { rows = rows.filter(r => values.includes(r[key as keyof typeof r])); return query; },
        gt: () => { rows = []; return query; },
        then: (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({ data: rows, error: null })),
      }; return query;
    } } as unknown as Parameters<typeof loadLearnerAttendance>[0];
    const schedule = buildMvpSchedule({ track, asOf: date, verifiedStartSessions: getMvpStartSlots(track), confirmedHeldSessions: null });
    const context = new Map([['["p","course"]', { slots: null, startSlots: schedule.startSessions, reason: "Delivery not confirmed" }],
      ['["other","course"]', { slots: null, startSlots: schedule.startSessions, reason: "Delivery not confirmed" }]]);
    const learners = await loadLearnerAttendance(db, [{ id: "a", enrollments: [
      { programId: "p", courseSlug: "course" }, { programId: "other", courseSlug: "course" },
    ] }], context, date);
    const performance = calculateMvpCoursePerformance(track, ["a", "a"], [...records, ...records], [], date);
    expect(learners[0].enrollments[0].hasStartEvidence).toBe(expected);
    expect(learners[0].enrollments[1].hasStartEvidence).toBe(false);
    expect(performance.started).toBe(expected ? 1 : 0);
    expect(learners[0].enrollments[0].attendance).toBeNull();
  });
});
