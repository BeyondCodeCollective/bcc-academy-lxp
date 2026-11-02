import { describe, expect, it } from "vitest";
import { getResourceEmbedUrl, getYouTubeStartSeconds } from "./storage-utils";

describe("getYouTubeStartSeconds", () => {
  it("reads t= in seconds, 69s and 1m9s forms", () => {
    expect(getYouTubeStartSeconds("https://www.youtube.com/watch?v=abc&t=69")).toBe(69);
    expect(getYouTubeStartSeconds("https://youtu.be/abc?t=69s")).toBe(69);
    expect(getYouTubeStartSeconds("https://www.youtube.com/watch?v=abc&t=1m9s")).toBe(69);
    expect(getYouTubeStartSeconds("https://www.youtube.com/watch?v=abc&start=7")).toBe(7);
  });
  it("is 0 when absent or junk", () => {
    expect(getYouTubeStartSeconds("https://www.youtube.com/watch?v=abc")).toBe(0);
    expect(getYouTubeStartSeconds("https://www.youtube.com/watch?v=abc&t=zzz")).toBe(0);
    expect(getYouTubeStartSeconds("not a url")).toBe(0);
  });
});

describe("getResourceEmbedUrl", () => {
  it("embeds YouTube on the privacy host with the start time", () => {
    expect(getResourceEmbedUrl("https://www.youtube.com/watch?v=abc&t=69")).toBe(
      "https://www.youtube-nocookie.com/embed/abc?rel=0&start=69",
    );
  });
  it("omits start when there is none", () => {
    expect(getResourceEmbedUrl("https://youtu.be/abc")).toBe(
      "https://www.youtube-nocookie.com/embed/abc?rel=0",
    );
  });
  it("is null for non-YouTube links", () => {
    expect(getResourceEmbedUrl("https://docs.google.com/document/d/1")).toBeNull();
  });
});
