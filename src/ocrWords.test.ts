import { describe, it, expect } from "vitest";
import { extractOcrCandidates, MAX_OCR_CANDIDATES } from "./ocrWords";

describe("extractOcrCandidates", () => {
  it("keeps single-letter words and curly apostrophes", () =>
    expect(extractOcrCandidates("a I can’t").map((c) => c.text)).toEqual([
      "a",
      "I",
      "can't",
    ]));
  it("should handle blank input", () => {
    expect(extractOcrCandidates("")).toEqual([]);
    expect(extractOcrCandidates("   ")).toEqual([]);
  });

  it("should extract simple words", () => {
    const result = extractOcrCandidates("apple banana cherry");
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
    expect(result.map((c) => c.text)).toContain("cherry");
    expect(result.every((c) => c.selected === true)).toBe(true);
    expect(result.every((c) => c.needsReview === false)).toBe(true);
  });

  it("should remove numbered list prefixes", () => {
    const result = extractOcrCandidates("1. apple\n2. banana\n3. cherry");
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
    expect(result.map((c) => c.text)).toContain("cherry");
  });

  it("should remove bullet prefixes", () => {
    const result = extractOcrCandidates("- apple\n* banana\n• cherry");
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
    expect(result.map((c) => c.text)).toContain("cherry");
  });

  it("should handle common worksheet headings", () => {
    const result = extractOcrCandidates(
      "Spelling Words\nList Name Date\nWeek Grade",
    );
    const headings = result.filter((c) => c.needsReview && !c.selected);
    expect(headings.length).toBeGreaterThan(0);
    expect(headings.some((c) => c.text.toLowerCase() === "spelling")).toBe(
      true,
    );
  });

  it("should split on commas", () => {
    const result = extractOcrCandidates("apple, banana, cherry");
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
    expect(result.map((c) => c.text)).toContain("cherry");
  });

  it("should trim punctuation around tokens", () => {
    const result = extractOcrCandidates('"apple" (banana) [cherry].');
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
    expect(result.map((c) => c.text)).toContain("cherry");
  });

  it("should normalize apostrophes", () => {
    const result = extractOcrCandidates("don't doesn't can't");
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.text.includes("'"))).toBe(true);
    expect(result.every((c) => c.selected === true)).toBe(true);
  });

  it("should preserve words with hyphens", () => {
    const result = extractOcrCandidates("well-being self-aware");
    expect(result.map((c) => c.text)).toContain("well-being");
    expect(result.map((c) => c.text)).toContain("self-aware");
    expect(result.every((c) => c.selected === true)).toBe(true);
  });

  it("should deduplicate case-insensitively", () => {
    const result = extractOcrCandidates("Apple apple APPLE");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Apple"); // Preserves first occurrence
  });

  it('should handle suspicious alphanumeric tokens like "1eaf"', () => {
    const result = extractOcrCandidates("leaf 1eaf 1emon");
    const invalidTokens = result.filter((c) => c.needsReview && !c.selected);
    expect(invalidTokens.some((c) => c.text === "1eaf")).toBe(true);
    expect(invalidTokens.some((c) => c.text === "1emon")).toBe(true);
    expect(result.some((c) => c.text === "leaf" && c.selected)).toBe(true);
  });

  it("should drop pure numbering", () => {
    const result = extractOcrCandidates("apple 123 456 banana");
    expect(result.map((c) => c.text)).not.toContain("123");
    expect(result.map((c) => c.text)).not.toContain("456");
    expect(result).toHaveLength(2);
  });

  it("should drop pure punctuation", () => {
    const result = extractOcrCandidates("apple ... ??? banana");
    expect(result.map((c) => c.text)).not.toContain("...");
    expect(result.map((c) => c.text)).not.toContain("???");
    expect(result).toHaveLength(2);
  });

  it("should respect 40-character length limit", () => {
    const longWord = "a".repeat(40);
    const veryLongWord = "a".repeat(41);
    const result = extractOcrCandidates(`${longWord} ${veryLongWord}`);
    const long40 = result.find((c) => c.text === longWord);
    const longOver40 = result.find((c) => c.text === veryLongWord);
    expect(long40?.selected).toBe(true);
    expect(long40?.needsReview).toBe(false);
    expect(longOver40?.selected).toBe(false);
    expect(longOver40?.needsReview).toBe(true);
  });

  it("should enforce MAX_OCR_CANDIDATES safety cap", () => {
    const tokens = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
    const result = extractOcrCandidates(tokens);
    expect(result.length).toBeLessThanOrEqual(MAX_OCR_CANDIDATES);
    expect(result.length).toBe(MAX_OCR_CANDIDATES);
  });

  it("should handle multiple columns separated by multiple spaces", () => {
    const result = extractOcrCandidates("apple      banana\ncherry      date");
    expect(result).toHaveLength(4);
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
    expect(result.map((c) => c.text)).toContain("cherry");
    expect(result.map((c) => c.text)).toContain("date");
  });

  it("should handle mixed list prefixes", () => {
    const result = extractOcrCandidates(
      "1) apple\n2. banana\na) cherry\n- date\n* elderberry",
    );
    expect(result).toHaveLength(5);
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
    expect(result.map((c) => c.text)).toContain("cherry");
    expect(result.map((c) => c.text)).toContain("date");
    expect(result.map((c) => c.text)).toContain("elderberry");
  });

  it("should handle apostrophe variants", () => {
    const result = extractOcrCandidates("don't don't don`t");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("don't");
    expect(result[0].selected).toBe(true);
  });

  it("should skip lines with only list markers", () => {
    const result = extractOcrCandidates("apple\n1. 2. 3.\nbanana");
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.text)).toContain("apple");
    expect(result.map((c) => c.text)).toContain("banana");
  });

  it("should preserve case in returned text", () => {
    const result = extractOcrCandidates("Apple BANANA ChErRy");
    expect(result.map((c) => c.text)).toContain("Apple");
    expect(result.map((c) => c.text)).toContain("BANANA");
    expect(result.map((c) => c.text)).toContain("ChErRy");
  });

  it("should correctly flag common headings regardless of case", () => {
    const result = extractOcrCandidates("SPELLING Words LIST name DATE");
    const headings = result.filter((c) => c.needsReview && !c.selected);
    expect(headings.length).toBeGreaterThanOrEqual(4);
  });
});
