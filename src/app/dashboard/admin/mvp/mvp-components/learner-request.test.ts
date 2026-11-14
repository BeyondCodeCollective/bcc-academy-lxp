import { describe, expect, it, vi } from "vitest";
import { startLearnerRequest } from "./learner-request";

function deferred() {
  let resolve!: (value: string) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe("Learner request cleanup", () => {
  it.each(["success", "error"])("ignores an old %s arriving after the newer response", async outcome => {
    const old = deferred(); const current = deferred();
    const show = vi.fn(); const fail = vi.fn();
    const cancel = startLearnerRequest(() => old.promise, show, fail);
    cancel();
    startLearnerRequest(() => current.promise, show, fail);
    current.resolve("current learners");
    await flush();
    if (outcome === "success") old.resolve("stale learners");
    else old.reject(new Error("stale failure"));
    await flush();
    expect(show.mock.calls).toEqual([["current learners"]]);
    expect(fail).not.toHaveBeenCalled();
  });
  it("does not revive a canceled request when returning to the same filters", async () => {
    const firstA = deferred(); const secondA = deferred(); const show = vi.fn();
    const cancel = startLearnerRequest(() => firstA.promise, show, vi.fn());
    cancel();
    startLearnerRequest(() => secondA.promise, show, vi.fn());
    firstA.resolve("old A"); secondA.resolve("new A");
    await flush();
    expect(show.mock.calls).toEqual([["new A"]]);
  });
  it("reports an active failure and allows a fresh retry", async () => {
    const show = vi.fn(); const fail = vi.fn();
    startLearnerRequest(() => Promise.reject(new Error("private")), show, fail);
    await flush();
    expect(fail).toHaveBeenCalledExactlyOnceWith();
    startLearnerRequest(() => Promise.resolve("retry results"), show, fail);
    await flush();
    expect(show).toHaveBeenCalledExactlyOnceWith("retry results");
  });
});
