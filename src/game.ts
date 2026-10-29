export type Word = { text: string; sentence: string };
export type Game = {
  version: 1;
  title: string;
  words: Word[];
  queue: number[];
  grown: number[];
  attempts: number;
  round: number;
};
export const normalize = (s: string) =>
  s.normalize("NFC").trim().toLocaleLowerCase("en-US").replace(/[’‘]/g, "'");
export function parseWords(input: string): Word[] {
  const seen = new Set<string>();
  const rows = input
    .split(/\r?\n/)
    .flatMap((line) => (line.includes("|") ? [line] : line.split(",")))
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length > 100)
    throw new Error("Add up to 100 words. Use a new list for the rest.");
  const words: Word[] = [];
  for (const row of rows) {
    const [raw, ...context] = row.split("|");
    const text = normalize(raw);
    if (!/^[a-z]+(?:['-][a-z]+)*$/.test(text) || text.length > 40)
      throw new Error(
        `“${raw.trim().slice(0, 40)}” needs checking. Use English words, with hyphens or apostrophes if needed.`,
      );
    const sentence = context.join("|").trim();
    if (sentence.length > 250)
      throw new Error("Keep each example sentence under 250 characters.");
    if (!seen.has(text)) {
      words.push({ text, sentence });
      seen.add(text);
    }
  }
  if (!words.length)
    throw new Error("Add at least one word to plant your garden.");
  return words;
}
export function newGame(words: Word[], title: string, round = 1): Game {
  return {
    version: 1,
    title: title.trim().slice(0, 60) || "My garden",
    words,
    queue: words.map((_, i) => i),
    grown: [],
    attempts: 0,
    round,
  };
}
export function answerGame(
  game: Game,
  answer: string,
  helped: boolean,
): { game: Game; correct: boolean; earned: boolean } {
  const index = game.queue[0];
  if (index === undefined) return { game, correct: false, earned: false };
  const correct = normalize(answer) === normalize(game.words[index].text);
  const earned = correct && !helped;
  const queue = game.queue.slice(1);
  if (!earned) queue.push(index);
  return {
    correct,
    earned,
    game: {
      ...game,
      queue,
      grown: earned ? [...game.grown, index] : game.grown,
      attempts: game.attempts + 1,
    },
  };
}
export function validGame(value: unknown): value is Game {
  if (!value || typeof value !== "object") return false;
  const g = value as Game;
  if (
    g.version !== 1 ||
    typeof g.title !== "string" ||
    g.title.length > 60 ||
    !Array.isArray(g.words) ||
    g.words.length < 1 ||
    g.words.length > 100
  )
    return false;
  if (
    !g.words.every(
      (w) =>
        w &&
        typeof w.text === "string" &&
        /^[a-z]+(?:['-][a-z]+)*$/.test(w.text) &&
        w.text.length <= 40 &&
        typeof w.sentence === "string" &&
        w.sentence.length <= 250,
    )
  )
    return false;
  if (new Set(g.words.map((w) => w.text)).size !== g.words.length) return false;
  if (!Array.isArray(g.queue) || !Array.isArray(g.grown)) return false;
  const ids = [...g.queue, ...g.grown];
  return (
    ids.length === g.words.length &&
    new Set(ids).size === ids.length &&
    ids.every((i) => Number.isInteger(i) && i >= 0 && i < g.words.length) &&
    Number.isSafeInteger(g.attempts) &&
    g.attempts >= 0 &&
    Number.isSafeInteger(g.round) &&
    g.round >= 1
  );
}
export const demo = newGame(
  parseWords(
    "sun | The sun warms our garden.\nseed | Plant a seed in the soil.\nleaf | A leaf grows on the stem.\ncarrot | The rabbit likes a carrot.\napple | Pick an apple from the tree.\ngarden | We grow food in our garden.",
  ),
  "The first little harvest",
);
