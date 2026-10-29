import { describe, it, expect } from "vitest";
import { kokoroSegmentText } from "./kokoroText";
describe("Kokoro isolated prompt formatting", () => {
  it("bounds seed without adding an article", () => {
    expect(kokoroSegmentText("seed", 0, 3)).toBe("Seed.");
    expect(kokoroSegmentText("seed", 2, 3)).toBe("Seed.");
  });
  it("keeps sentence content unchanged", () =>
    expect(kokoroSegmentText("Plant a seed in the soil.", 1, 3)).toBe(
      "Plant a seed in the soil.",
    ));
  it.each(["apple", "garden", "sun", "mother-in-law", "can't"])(
    "handles %s without word-specific rules",
    (word) =>
      expect(kokoroSegmentText(word, 0, 2)).toBe(
        word[0].toUpperCase() + word.slice(1) + ".",
      ),
  );
  it("does not duplicate ending punctuation", () =>
    expect(kokoroSegmentText("Seed.", 0, 2)).toBe("Seed."));
  it("ignores empty input", () =>
    expect(kokoroSegmentText("  ", 0, 2)).toBe(""));
});
