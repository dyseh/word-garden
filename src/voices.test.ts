import { describe, it, expect } from "vitest";
import { childFriendlyVoices, chooseVoice } from "./voices";
import { alignSpelling } from "./spellingFeedback";
const voices = [
  { name: "Boing", lang: "en-US", localService: true, voiceURI: "boing" },
  { name: "Samantha", lang: "en-US", localService: true, voiceURI: "sam" },
  { name: "Remote", lang: "en-US", localService: false, voiceURI: "remote" },
  { name: "French", lang: "fr-FR", localService: true, voiceURI: "fr" },
];
describe("voice selection", () => {
  it("excludes novelty and remote voices by default", () =>
    expect(childFriendlyVoices(voices, false).map((v) => v.name)).toEqual([
      "Samantha",
    ]));
  it("allows only opted-in English remote voices", () =>
    expect(childFriendlyVoices(voices, true).map((v) => v.name)).toEqual([
      "Samantha",
      "Remote",
    ]));
  it("prefers a user selection", () =>
    expect(chooseVoice(voices, "remote")?.name).toBe("Remote"));
  it("prefers a narration voice", () =>
    expect(chooseVoice(voices, "")?.name).toBe("Samantha"));
  it("handles empty available voices", () =>
    expect(chooseVoice([], "")).toBeUndefined());
});
describe("full feedback rendering", () => {
  it("keeps context around missing letters", () => {
    const parts = alignSpelling("apple", "aple", true);
    expect(parts.map((p) => p.expected).join("")).toBe("apple");
    expect(parts.map((p) => p.actual).join("")).toBe("aple");
    expect(parts.filter((p) => p.kind === "missing")).toHaveLength(1);
  });
  it("preserves extra-letter positioning", () => {
    const parts = alignSpelling("sun", "sunn", true);
    expect(parts.map((p) => p.actual).join("")).toBe("sunn");
    expect(parts.map((p) => p.expected).join("")).toBe("sun");
  });
});
