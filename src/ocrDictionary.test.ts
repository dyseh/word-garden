import { describe, expect, it } from "vitest";
import { isEnglishWord } from "./ocrDictionary";
import { extractOcrCandidates } from "./ocrWords";

describe("offline English OCR dictionary", () => {
  it.each([
    "apple",
    "LEAF",
    "children",
    "running",
    "jumped",
    "colour",
    "color",
    "centre",
    "center",
    "a",
    "I",
    "can't",
    "doesn’t",
    "well-being",
    "self-aware",
    "mother-in-law",
  ])("keeps %s", (word) => {
    expect(isEnglishWord(word)).toBe(true);
  });
  it.each([
    "qzxv",
    "applle",
    "bananna",
    "teh",
    "1eaf",
    "word123",
    "b",
    "x",
    "zz",
    "leaf-qzxv",
    "can'zz",
    "",
    "a".repeat(41),
  ])("rejects %s", (word) => {
    expect(isEnglishWord(word)).toBe(false);
  });
  it("removes gibberish without silently correcting it", () => {
    expect(
      extractOcrCandidates(
        "apple applle qzxv leaf 1eaf colour can’t",
        isEnglishWord,
      ).map((row) => row.text),
    ).toEqual(["apple", "leaf", "colour", "can't"]);
  });
  it("does not let rejected noise consume the candidate cap", () => {
    expect(
      extractOcrCandidates(
        `${Array(250).fill("qzxv").join(" ")} apple`,
        isEnglishWord,
      ).map((row) => row.text),
    ).toEqual(["apple"]);
  });
  it("returns an empty review list when no words are recognized", () => {
    expect(extractOcrCandidates("qzxv 1eaf applle", isEnglishWord)).toEqual([]);
  });
});
