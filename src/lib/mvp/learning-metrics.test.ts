import { describe, expect, it } from "vitest";
import { calculateMvpAssessment, calculateMvpVideoProgress } from "./learning-metrics";

const now = new Date("2026-10-01T00:00:00Z");
const exam = { id: "e", student_id: "u", exam_id: "exam", submitted_at: "2026-09-01T00:00:00Z", score: 4, total: 10 };
const video = { id: "v", user_id: "u", track_slug: "course", week_number: 1, video_watched_at: "2026-09-01T00:00:00Z" };
describe("learning metric denominators", () => {
  it("averages one latest percentage per learner, not points across different denominators", () => {
    const result = calculateMvpAssessment(["u", "v", "missing"], "exam", [exam,
      { ...exam, id: "new", submitted_at: "2026-09-02T00:00:00Z", score: 8 },
      { ...exam, id: "v", student_id: "v", score: 1, total: 2 },
      { ...exam, id: "outside", student_id: "outside", score: 10 }], now);
    expect(result).toMatchObject({ averagePercent: 65, assessedLearners: 2, eligibleLearners: 3, unavailableLearners: 1 });
  });
  it("preserves zero scores and unavailable mappings/attempts", () => {
    expect(calculateMvpAssessment(["u"], "exam", [{ ...exam, score: 0 }], now).averagePercent).toBe(0);
    expect(calculateMvpAssessment(["u"], null, [exam], now).averagePercent).toBeNull();
    expect(calculateMvpAssessment([], "exam", [exam], now).averagePercent).toBeNull();
  });
  it("does not fall back to stale scores after corrupt or tied latest results", () => {
    for (const rows of [[exam, { ...exam, id: "tie" }], [exam, { ...exam, id: "new", submitted_at: "2026-09-02T00:00:00Z", total: 0 }]]) {
      expect(calculateMvpAssessment(["u"], "exam", rows, now).averagePercent).toBeNull();
    }
  });
  it("deduplicates watched learner/week pairs and excludes unrelated evidence", () => {
    expect(calculateMvpVideoProgress(["u", "v", "u"], "course", [1, 2], [video, { ...video, id: "dup" },
      { ...video, user_id: "outsider" }, { ...video, track_slug: "other" }, { ...video, week_number: 9 }], now))
      .toMatchObject({ percent: 25, watchedLearnerWeeks: 1, requiredLearnerWeeks: 4 });
  });
  it("distinguishes an unwatched configured roster from unavailable mappings", () => {
    expect(calculateMvpVideoProgress(["u"], "course", [1, 2], [], now).percent).toBe(0);
    expect(calculateMvpVideoProgress(["u"], "course", null, [], now).percent).toBeNull();
    expect(calculateMvpVideoProgress([], "course", [1], [], now).percent).toBeNull();
    expect(calculateMvpVideoProgress(["u"], "course", [1], [{ ...video, video_watched_at: "bad" }], now).percent).toBeNull();
  });
});
