import { describe, it, expect } from "vitest";
import { alignSpelling } from "./spellingFeedback";

describe("alignSpelling", () => {
  describe("perfect matches", () => {
    it("returns empty for identical strings", () => {
      expect(alignSpelling("cat", "cat")).toEqual([]);
    });

    it("handles case-insensitive matches", () => {
      expect(alignSpelling("CAT", "cat")).toEqual([]);
    });

    it("handles whitespace trimming", () => {
      expect(alignSpelling("  cat  ", "cat")).toEqual([]);
    });

    it("normalizes apostrophes to straight apostrophe", () => {
      expect(alignSpelling("can't", "can't")).toEqual([]);
      expect(alignSpelling("can't", "can't")).toEqual([]);
    });
  });

  describe("single character replacements", () => {
    it("detects one-char replacement", () => {
      const result = alignSpelling("cat", "bat");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ expected: "c", actual: "b", kind: "replace" });
    });

    it("detects multiple replacements", () => {
      const result = alignSpelling("cat", "dog");
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ expected: "c", actual: "d", kind: "replace" });
      expect(result[1]).toEqual({ expected: "a", actual: "o", kind: "replace" });
      expect(result[2]).toEqual({ expected: "t", actual: "g", kind: "replace" });
    });

    it("replaces middle character", () => {
      const result = alignSpelling("spell", "spill");
      expect(result.filter((a) => a.kind === "replace")).toHaveLength(1);
      const replace = result.find((a) => a.kind === "replace");
      expect(replace).toEqual({ expected: "e", actual: "i", kind: "replace" });
    });
  });

  describe("missing characters (in attempt)", () => {
    it("detects missing characters at the start", () => {
      const result = alignSpelling("apple", "ple");
      expect(result.filter((a) => a.kind === "missing")).toHaveLength(2);
    });

    it("detects missing characters in the middle", () => {
      const result = alignSpelling("spell", "spl");
      const missing = result.filter((a) => a.kind === "missing");
      expect(missing).toHaveLength(2);
    });

    it("detects missing characters at the end", () => {
      const result = alignSpelling("apple", "app");
      const missing = result.filter((a) => a.kind === "missing");
      expect(missing).toHaveLength(2);
    });

    it("detects all missing when attempt is empty", () => {
      const result = alignSpelling("hello", "");
      expect(result).toHaveLength(5);
      expect(result.every((a) => a.kind === "missing")).toBe(true);
      expect(result.map((a) => a.expected)).toEqual([
        "h",
        "e",
        "l",
        "l",
        "o",
      ]);
    });
  });

  describe("extra characters (in attempt)", () => {
    it("detects extra characters at the start", () => {
      const result = alignSpelling("cat", "pcat");
      expect(result.filter((a) => a.kind === "extra")).toHaveLength(1);
    });

    it("detects extra characters in the middle", () => {
      const result = alignSpelling("cat", "capt");
      const extra = result.filter((a) => a.kind === "extra");
      expect(extra).toHaveLength(1);
      expect(extra[0]).toEqual({ expected: "", actual: "p", kind: "extra" });
    });

    it("detects extra characters at the end", () => {
      const result = alignSpelling("cat", "cats");
      const extra = result.filter((a) => a.kind === "extra");
      expect(extra).toHaveLength(1);
      expect(extra[0]).toEqual({ expected: "", actual: "s", kind: "extra" });
    });

    it("detects all extra when expected is empty", () => {
      const result = alignSpelling("", "hello");
      expect(result).toHaveLength(5);
      expect(result.every((a) => a.kind === "extra")).toBe(true);
      expect(result.map((a) => a.actual)).toEqual(["h", "e", "l", "l", "o"]);
    });
  });

  describe("repeated letters", () => {
    it("handles doubled letters correctly", () => {
      const result = alignSpelling("hello", "helo");
      const missing = result.filter((a) => a.kind === "missing");
      expect(missing).toHaveLength(1);
      expect(missing[0]).toEqual({ expected: "l", actual: "", kind: "missing" });
    });

    it("handles extra doubled letters", () => {
      const result = alignSpelling("helo", "hello");
      const extra = result.filter((a) => a.kind === "extra");
      expect(extra).toHaveLength(1);
      expect(extra[0]).toEqual({ expected: "", actual: "l", kind: "extra" });
    });

    it("detects repeated letter typos", () => {
      const result = alignSpelling("book", "boook");
      const extra = result.filter((a) => a.kind === "extra");
      expect(extra).toHaveLength(1);
    });
  });

  describe("apostrophes and special characters", () => {
    it("handles apostrophes in expected word", () => {
      const result = alignSpelling("can't", "cant");
      expect(result.filter((a) => a.kind === "missing")).toHaveLength(1);
    });

    it("handles apostrophes in attempt", () => {
      const result = alignSpelling("cant", "can't");
      expect(result.filter((a) => a.kind === "extra")).toHaveLength(1);
    });

    it("normalizes curly apostrophes to straight", () => {
      const result = alignSpelling("can't", "can't");
      expect(result).toEqual([]);
    });

    it("handles hyphenated words", () => {
      const result = alignSpelling("mother-in-law", "mother in law");
      // normalize doesn't convert spaces to hyphens, so they differ
      expect(result.some((a) => a.kind === "replace")).toBe(true);
      expect(result.filter((a) => a.expected === "-").length).toBe(2);
    });
  });

  describe("case insensitivity", () => {
    it("normalizes uppercase", () => {
      const result = alignSpelling("HELLO", "hello");
      expect(result).toEqual([]);
    });

    it("normalizes mixed case", () => {
      const result = alignSpelling("HeLLo", "hello");
      expect(result).toEqual([]);
    });

    it("case mismatch in replacement is normalized", () => {
      const result = alignSpelling("Hello", "hallo");
      expect(result[0]).toEqual({ expected: "e", actual: "a", kind: "replace" });
    });
  });

  describe("empty inputs", () => {
    it("returns empty for both empty strings", () => {
      expect(alignSpelling("", "")).toEqual([]);
    });

    it("returns empty for whitespace-only strings", () => {
      expect(alignSpelling("   ", "   ")).toEqual([]);
    });
  });

  describe("complex scenarios", () => {
    it("handles combination of errors: missing + extra + replace", () => {
      const result = alignSpelling("spring", "spiring");
      // Filters out matches, so only errors are returned
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((a) => a.kind !== "match")).toBe(true);
    });

    it("distinguishes similar words with multiple differences", () => {
      const result = alignSpelling("there", "three");
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles long words with multiple typos", () => {
      const result = alignSpelling("encyclopedia", "enciclopedia");
      // Only returns errors (replacements), not matches
      expect(result.some((a) => a.kind === "replace")).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("detects transposition-like errors", () => {
      // "teh" vs "the": position swap shows as operations
      const result = alignSpelling("the", "teh");
      // Only errors returned, so less than 3
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("real spelling mistakes", () => {
    it("detects: reciever -> receive", () => {
      const result = alignSpelling("receive", "reciever");
      expect(result.some((a) => a.kind === "extra")).toBe(true);
    });

    it("detects: occured -> occurred", () => {
      const result = alignSpelling("occurred", "occured");
      expect(result.filter((a) => a.kind === "missing")).toHaveLength(1);
    });

    it("detects: bussiness -> business", () => {
      const result = alignSpelling("business", "bussiness");
      expect(result.filter((a) => a.kind === "extra")).toHaveLength(1);
    });

    it("detects: untill -> until", () => {
      const result = alignSpelling("until", "untill");
      expect(result.filter((a) => a.kind === "extra")).toHaveLength(1);
    });

    it("handles: your -> your (correct)", () => {
      expect(alignSpelling("your", "your")).toEqual([]);
    });

    it("detects: your -> you're (apostrophe extra/replace)", () => {
      const result = alignSpelling("your", "you're");
      expect(result.some((a) => a.kind !== "match")).toBe(true);
    });
  });

  describe("alignment structure", () => {
    it("preserves order of characters in result", () => {
      const result = alignSpelling("abc", "ac");
      expect(result.length).toBe(1);
      expect(result[0].expected).toBe("b");
      expect(result[0].kind).toBe("missing");
    });

    it("all alignments have required fields", () => {
      const result = alignSpelling("cat", "bat");
      result.forEach((alignment) => {
        expect(alignment).toHaveProperty("expected");
        expect(alignment).toHaveProperty("actual");
        expect(alignment).toHaveProperty("kind");
        expect(["match", "replace", "missing", "extra"]).toContain(
          alignment.kind,
        );
      });
    });

    it("expected field is always set for non-extra alignments", () => {
      const result = alignSpelling("hello", "hallo");
      result.forEach((a) => {
        if (a.kind !== "extra") {
          expect(a.expected).toBeTruthy();
        }
      });
    });

    it("actual field is always set for non-missing alignments", () => {
      const result = alignSpelling("hello", "halo");
      result.forEach((a) => {
        if (a.kind !== "missing") {
          expect(a.actual).toBeTruthy();
        }
      });
    });
  });
});
