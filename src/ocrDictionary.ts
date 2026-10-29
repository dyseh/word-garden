import nspell from "nspell";
// Import dictionary data, not the packages' Node-only filesystem entry points.
import usAff from "../node_modules/dictionary-en/index.aff?raw";
import usDic from "../node_modules/dictionary-en/index.dic?raw";
import gbAff from "../node_modules/dictionary-en-gb/index.aff?raw";
import gbDic from "../node_modules/dictionary-en-gb/index.dic?raw";

const dictionaries = [nspell(usAff, usDic), nspell(gbAff, gbDic)];

/** Offline US/UK spelling check. Never guess corrections for OCR mistakes. */
export function isEnglishWord(token: string): boolean {
  const word = token.toLowerCase().replace(/[‘’`]/g, "'");
  if (word.length > 40 || !/^[a-z]+(?:[-'][a-z]+)*$/.test(word)) return false;
  // Spell-check dictionaries include letter names; most are OCR fragments here.
  if (word.length === 1) return word === "a" || word === "i";
  // Hunspell's hyphen break handling is not implemented by nspell. Validate
  // each component so compounds such as self-aware and mother-in-law survive.
  return word
    .split("-")
    .every(
      (part) =>
        (part.length !== 1 || part === "a" || part === "i") &&
        dictionaries.some((dictionary) => dictionary.correct(part)),
    );
}
