import { describe, it, expect } from "vitest";
import {
  dictionaryChoices,
  validHelp,
  hideTarget,
  helpKey,
} from "./dictionary";
const entry = {
  sourceUrls: ["https://en.wiktionary.org/wiki/seed"],
  license: {
    name: "CC BY-SA 3.0",
    url: "https://creativecommons.org/licenses/by-sa/3.0",
  },
  meanings: [
    {
      partOfSpeech: "noun",
      definitions: [
        {
          definition: "A small part that can grow into a plant.",
          example: "Plant a seed.",
        },
      ],
    },
  ],
};
describe("dictionary adapter", () => {
  it("keeps definition example and attribution together", () =>
    expect(dictionaryChoices([entry])).toEqual([
      {
        definition: "A small part that can grow into a plant.",
        sentence: "Plant a seed.",
        partOfSpeech: "noun",
        source: entry.sourceUrls[0],
        license: entry.license.name,
        licenseUrl: entry.license.url,
      },
    ]));
  it("rejects error responses", () =>
    expect(dictionaryChoices({ title: "No Definitions Found" })).toEqual([]));
  it("rejects unsafe source and license URLs", () => {
    expect(
      dictionaryChoices([{ ...entry, sourceUrls: ["javascript:alert(1)"] }]),
    ).toEqual([]);
    expect(
      dictionaryChoices([
        { ...entry, license: { name: "x", url: "https://evil.test" } },
      ]),
    ).toEqual([]);
  });
  it("caps entries and excludes overlong text", () => {
    const long = {
      ...entry,
      meanings: [{ definitions: [{ definition: "x".repeat(251) }] }],
    };
    expect(dictionaryChoices([long])).toEqual([]);
    const many = {
      ...entry,
      meanings: Array(12).fill({
        definitions: Array(20).fill({ definition: "Meaning" }),
      }),
    };
    expect(dictionaryChoices([many])).toHaveLength(30);
  });
  it("supports examples missing from provider", () =>
    expect(
      dictionaryChoices([
        { ...entry, meanings: [{ definitions: [{ definition: "Meaning" }] }] },
      ])[0].sentence,
    ).toBe(""));
  it("validates approved local records and target", () => {
    const v = {
      version: 1,
      word: "seed",
      definition: "A small part.",
      sentence: "Plant a seed.",
      source: "",
      license: "",
      licenseUrl: "",
    };
    expect(validHelp(v, "seed")).toBe(true);
    expect(validHelp(v, "sun")).toBe(false);
    expect(validHelp({ ...v, definition: "x".repeat(251) }, "seed")).toBe(
      false,
    );
    expect(validHelp({ ...v, source: entry.sourceUrls[0] }, "seed")).toBe(
      false,
    );
  });
  it("hides whole target words without hiding other words", () =>
    expect(hideTarget("A seed is not a seedling. SEED.", "seed")).toBe(
      "A [word] is not a seedling. [word].",
    ));
  it("supports apostrophes and safe cache keys", () => {
    expect(hideTarget("They're coming.", "they're")).toBe("[word] coming.");
    expect(helpKey(" Seed ")).toBe("word-garden-word-help-v1:seed");
  });
});
