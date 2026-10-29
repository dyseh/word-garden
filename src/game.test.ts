import { describe, it, expect } from "vitest";
import { parseWords, newGame, answerGame, validGame, normalize } from "./game";
describe("word lists", () => {
  it('preserves commas in example sentences',()=>expect(parseWords('apple | First, pick an apple.\nleaf,sun')).toEqual([{text:'apple',sentence:'First, pick an apple.'},{text:'leaf',sentence:''},{text:'sun',sentence:''}]));
  it("normalizes and deduplicates", () =>
    expect(parseWords(" Sun, sun\n leaf ")).toEqual([
      { text: "sun", sentence: "" },
      { text: "leaf", sentence: "" },
    ]));
  it("preserves example sentences", () =>
    expect(parseWords("pear | I ate a pear.")[0].sentence).toBe(
      "I ate a pear.",
    ));
  it("accepts apostrophes and hyphens", () =>
    expect(parseWords("can’t\nmother-in-law")).toHaveLength(2));
  it.each(["", "!!!", "two words", "123", "a".repeat(41)])(
    "rejects invalid entry %s",
    (input) => expect(() => parseWords(input)).toThrow(),
  );
  it("bounds lists and context", () => {
    expect(() => parseWords(Array(101).fill("sun").join("\n"))).toThrow();
    expect(() => parseWords("sun | " + "x".repeat(251))).toThrow();
  });
  it("normalizes answers", () => expect(normalize(" CAN’T ")).toBe("can't"));
});
describe("garden progression", () => {
  const game = () => newGame(parseWords("sun,leaf,apple"), "My garden");
  it("earns one plant for an independent correct answer", () => {
    const r = answerGame(game(), " SUN ", false);
    expect(r.earned).toBe(true);
    expect(r.game.grown).toEqual([0]);
    expect(r.game.queue).toEqual([1, 2]);
    expect(validGame(r.game)).toBe(true);
  });
  it("requeues mistakes without losing earned plants", () => {
    const first = answerGame(game(), "sun", false).game;
    const result = answerGame(first, "leef", false);
    expect(result.game.queue).toEqual([2, 1]);
    expect(result.game.grown).toEqual([0]);
  });
  it("does not reward hinted answers", () => {
    const r = answerGame(game(), "sun", true);
    expect(r.correct).toBe(true);
    expect(r.earned).toBe(false);
    expect(r.game.queue).toEqual([1, 2, 0]);
  });
  it("completes and cannot double award", () => {
    let g = game();
    for (const word of ["sun", "leaf", "apple"])
      g = answerGame(g, word, false).game;
    expect(g.queue).toEqual([]);
    expect(g.grown).toHaveLength(3);
    expect(answerGame(g, "apple", false).game).toBe(g);
  });
  it("keeps a single wrong word playable", () => {
    const g = newGame(parseWords("sun"), "One");
    expect(answerGame(g, "son", false).game.queue).toEqual([0]);
  });
  it("rejects corrupted backups", () => {
    expect(validGame({ ...game(), queue: [0, 0, 2] })).toBe(false);
    expect(validGame({ ...game(), attempts: -1 })).toBe(false);
    expect(
      validGame({ ...game(), words: [{ text: "<script>", sentence: "" }] }),
    ).toBe(false);
    expect(validGame(null)).toBe(false);
  });
});
