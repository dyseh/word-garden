import { describe, it, expect } from "vitest";
import { promptSegments, joinWithPauses, PAUSE_MS } from "./speechPrompt";

describe("speechPrompt", () => {
  describe("promptSegments", () => {
    it("returns empty array for empty text", () => {
      const result = promptSegments({ text: "", sentence: "" });
      expect(result).to.deep.equal([]);
    });

    it("returns empty array when text is only whitespace", () => {
      const result = promptSegments({ text: "   ", sentence: "" });
      expect(result).to.deep.equal([]);
    });

    it("repeats trimmed word when sentence is empty", () => {
      const result = promptSegments({ text: "  hello  ", sentence: "" });
      expect(result).to.deep.equal(["hello", "hello"]);
    });

    it("returns [word, sentence, word] when both are present", () => {
      const result = promptSegments({
        text: "  cat  ",
        sentence: "  The cat sat.  ",
      });
      expect(result).to.deep.equal(["cat", "The cat sat.", "cat"]);
    });

    it("repeats word when sentence is only whitespace", () => {
      const result = promptSegments({
        text: "  dog  ",
        sentence: "   ",
      });
      expect(result).to.deep.equal(["dog", "dog"]);
    });

    it("trims all values correctly", () => {
      const result = promptSegments({
        text: "\t\n  apple  \n\t",
        sentence: "\n\nI love apples.\n\n",
      });
      expect(result).to.deep.equal(["apple", "I love apples.", "apple"]);
    });
  });

  describe("joinWithPauses", () => {
    it("returns empty array when no chunks provided", () => {
      const result = joinWithPauses([], 16000);
      expect(result).to.be.instanceOf(Float32Array);
      expect(result.length).to.equal(0);
    });

    it("filters out empty chunks", () => {
      const chunk1 = new Float32Array([0.1, 0.2]);
      const emptyChunk = new Float32Array([]);
      const chunk2 = new Float32Array([0.3, 0.4]);

      const result = joinWithPauses([chunk1, emptyChunk, chunk2], 16000);

      // Should have chunk1 + pause + chunk2
      const expectedLength =
        chunk1.length + chunk2.length + Math.round((900 / 1000) * 16000);
      expect(result.length).to.equal(expectedLength);
    });

    it("returns single chunk as-is without leading/trailing silence", () => {
      const chunk = new Float32Array([0.1, 0.2, 0.3]);
      const result = joinWithPauses([chunk], 16000);

      expect(result).to.deep.equal(chunk);
    });

    it("uses default PAUSE_MS of 900ms", () => {
      const chunk1 = new Float32Array([0.1]);
      const chunk2 = new Float32Array([0.2]);

      const result = joinWithPauses([chunk1, chunk2], 16000);

      // Calculate expected: 1 sample per chunk + pause samples
      const pauseSamples = Math.round((PAUSE_MS / 1000) * 16000);
      const expected = 1 + pauseSamples + 1;

      expect(result.length).to.equal(expected);
      expect(pauseSamples).to.equal(14400); // 900ms at 16kHz
    });

    it("handles two repetitions with no leading/trailing silence", () => {
      const word = new Float32Array([0.1, 0.2]);
      const sentence = new Float32Array([0.3, 0.4, 0.5]);
      const wordRepeat = new Float32Array([0.1, 0.2]);

      const result = joinWithPauses([word, sentence, wordRepeat], 16000, 900);

      const pauseSamples = Math.round((900 / 1000) * 16000);
      const expected = 2 + pauseSamples + 3 + pauseSamples + 2;

      expect(result.length).to.equal(expected);

      // First chunk (word)
      expect(result[0]).to.closeTo(0.1, 1e-6);
      expect(result[1]).to.closeTo(0.2, 1e-6);

      // Sentence (after first pause)
      expect(result[2 + pauseSamples]).to.closeTo(0.3, 1e-6);
      expect(result[3 + pauseSamples]).to.closeTo(0.4, 1e-6);
      expect(result[4 + pauseSamples]).to.closeTo(0.5, 1e-6);

      // Word repeat (after second pause)
      expect(result[5 + 2 * pauseSamples]).to.closeTo(0.1, 1e-6);
      expect(result[6 + 2 * pauseSamples]).to.closeTo(0.2, 1e-6);
    });

    it("validates sampleRate as positive finite integer", () => {
      const chunk = new Float32Array([0.1]);

      expect(() => joinWithPauses([chunk], -1)).to.throw(
        "sampleRate must be a finite positive integer",
      );
      expect(() => joinWithPauses([chunk], 0)).to.throw(
        "sampleRate must be a finite positive integer",
      );
      expect(() => joinWithPauses([chunk], NaN)).to.throw(
        "sampleRate must be a finite positive integer",
      );
      expect(() => joinWithPauses([chunk], Infinity)).to.throw(
        "sampleRate must be a finite positive integer",
      );
      expect(() => joinWithPauses([chunk], 16000.5)).to.throw(
        "sampleRate must be a finite positive integer",
      );
    });

    it("validates pauseMs as finite and non-negative", () => {
      const chunk = new Float32Array([0.1]);

      expect(() => joinWithPauses([chunk], 16000, -1)).to.throw(
        "pauseMs must be finite and non-negative",
      );
      expect(() => joinWithPauses([chunk], 16000, NaN)).to.throw(
        "pauseMs must be finite and non-negative",
      );
      expect(() => joinWithPauses([chunk], 16000, Infinity)).to.throw(
        "pauseMs must be finite and non-negative",
      );
    });

    it("allows pauseMs of 0", () => {
      const chunk1 = new Float32Array([0.1]);
      const chunk2 = new Float32Array([0.2]);

      const result = joinWithPauses([chunk1, chunk2], 16000, 0);

      // No pause, just concatenation
      expect(result.length).to.equal(2);
      expect(result[0]).to.closeTo(0.1, 1e-6);
      expect(result[1]).to.closeTo(0.2, 1e-6);
    });

    it("guards against allocations exceeding 5 minutes", () => {
      const largeChunk = new Float32Array(16000 * 60 * 5 + 1); // Slightly over 5 min
      const chunk2 = new Float32Array([0.1]);

      expect(() => joinWithPauses([largeChunk, chunk2], 16000, 900)).to.throw(
        "exceeds maximum of",
      );
    });

    it("preserves audio values through concatenation", () => {
      const chunk1 = new Float32Array([0.1, 0.2, 0.3]);
      const chunk2 = new Float32Array([0.4, 0.5]);

      const result = joinWithPauses([chunk1, chunk2], 16000, 900);

      const pauseSamples = Math.round((900 / 1000) * 16000);

      // Verify chunk1 values
      expect(result[0]).to.closeTo(0.1, 1e-6);
      expect(result[1]).to.closeTo(0.2, 1e-6);
      expect(result[2]).to.closeTo(0.3, 1e-6);

      // Verify pause is silence
      for (let i = 3; i < 3 + pauseSamples; i++) {
        expect(result[i]).to.equal(0);
      }

      // Verify chunk2 values
      expect(result[3 + pauseSamples]).to.closeTo(0.4, 1e-6);
      expect(result[4 + pauseSamples]).to.closeTo(0.5, 1e-6);
    });
  });
});
