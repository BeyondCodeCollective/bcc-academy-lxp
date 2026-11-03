import { describe, expect, it } from "vitest";
import {
  applyContentMap,
  resourcesForSession,
  tagSessionResources,
  type AdminSession,
  type AdminWeek,
  type SessionContentMap,
} from "./admin-shared";

const res = (name: string) => ({ name, url: `https://x.test/${name}`, type: "link" });
const session = (num: number, resources = [] as ReturnType<typeof res>[]): AdminSession => ({
  num,
  title: `S${num}`,
  meetingLink: "",
  recordingUrl: "",
  resources,
  homework: "",
  status: "upcoming",
});

describe("session resources round trip", () => {
  it("keeps session 2's resources in session 2 after save and reload", () => {
    const saved = tagSessionResources([session(1, [res("a")]), session(2, [res("b"), res("c")])]);
    const week: AdminWeek = {
      week: 1,
      title: "W1",
      icon: "book",
      sessions: [session(1), session(2)],
      overrideTitle: "",
      overrideSubtitle: "",
      overrideDescription: "",
      overrideObjectives: "",
    };
    const map: SessionContentMap = {
      1: {
        meeting_link: "", recording_url: "", meeting_link_2: "", recording_url_2: "",
        meeting_link_3: "", recording_url_3: "", status: "upcoming", status_2: "upcoming",
        status_3: "upcoming", resources: saved, title: null, subtitle: null, description: null,
        objectives: null, homework_instructions: "one", homework_instructions_2: "two",
        homework_instructions_3: null,
      },
    };
    const [loaded] = applyContentMap([week], map);
    expect(loaded.sessions[0].resources.map((r) => r.name)).toEqual(["a"]);
    expect(loaded.sessions[1].resources.map((r) => r.name)).toEqual(["b", "c"]);
    expect(loaded.sessions.map((s) => s.homework)).toEqual(["one", "two"]);
  });

  it("puts older untagged resources in session 1", () => {
    expect(resourcesForSession([res("old")], 1)).toHaveLength(1);
    expect(resourcesForSession([res("old")], 2)).toHaveLength(0);
  });
});
