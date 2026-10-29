import { normalize } from "./game";
export type DictionaryChoice = {
  definition: string;
  sentence: string;
  partOfSpeech: string;
  source: string;
  license: string;
  licenseUrl: string;
};
export type ApprovedHelp = {
  version: 1;
  word: string;
  definition: string;
  sentence: string;
  source: string;
  license: string;
  licenseUrl: string;
};
export const helpKey = (word: string) =>
  `word-garden-word-help-v1:${normalize(word)}`;
const safeText = (x: unknown, max: number) =>
  typeof x === "string" && x.trim().length <= max ? x.trim() : "";
const safeSource = (x: unknown) => {
  try {
    const url = new URL(String(x));
    return url.protocol === "https:" && url.hostname === "en.wiktionary.org"
      ? url.href
      : "";
  } catch {
    return "";
  }
};
const safeLicense = (x: unknown) => {
  try {
    const url = new URL(String(x));
    return url.protocol === "https:" && url.hostname === "creativecommons.org"
      ? url.href
      : "";
  } catch {
    return "";
  }
};
export function dictionaryChoices(data: unknown): DictionaryChoice[] {
  if (!Array.isArray(data)) return [];
  const choices: DictionaryChoice[] = [];
  for (const entry of data.slice(0, 5)) {
    if (!entry || typeof entry !== "object") continue;
    const source = Array.isArray(entry.sourceUrls)
      ? entry.sourceUrls.map(safeSource).find(Boolean) || ""
      : "";
    const license = safeText(entry.license?.name, 80),
      licenseUrl = safeLicense(entry.license?.url);
    if (!source || !license || !licenseUrl || !Array.isArray(entry.meanings))
      continue;
    for (const meaning of entry.meanings.slice(0, 12)) {
      if (!Array.isArray(meaning?.definitions)) continue;
      for (const row of meaning.definitions.slice(0, 20)) {
        const definition = safeText(row?.definition, 250);
        if (definition) {
          choices.push({
            definition,
            sentence: safeText(row.example, 250),
            partOfSpeech: safeText(meaning.partOfSpeech, 40),
            source,
            license,
            licenseUrl,
          });
          if (choices.length >= 30) return choices;
        }
      }
    }
  }
  return choices;
}
export function validHelp(value: unknown, word: string): value is ApprovedHelp {
  if (!value || typeof value !== "object") return false;
  const v = value as ApprovedHelp;
  return (
    v.version === 1 &&
    v.word === normalize(word) &&
    typeof v.definition === "string" &&
    v.definition.length <= 250 &&
    typeof v.sentence === "string" &&
    v.sentence.length <= 250 &&
    typeof v.source === "string" &&
    (!v.source || safeSource(v.source) === v.source) &&
    typeof v.license === "string" &&
    v.license.length <= 80 &&
    typeof v.licenseUrl === "string" &&
    (!v.licenseUrl || safeLicense(v.licenseUrl) === v.licenseUrl) &&
    (!v.source || (!!v.license && !!v.licenseUrl))
  );
}
export function hideTarget(text: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi"),
    "[word]",
  );
}
export async function lookupDictionary(
  word: string,
  signal: AbortSignal,
): Promise<DictionaryChoice[]> {
  const normalized = normalize(word);
  if (!/^[a-z]+(?:['-][a-z]+)*$/.test(normalized) || normalized.length > 40)
    throw new Error("Check the spelling and try again.");
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`,
    { signal, credentials: "omit", referrerPolicy: "no-referrer" },
  );
  if (response.status === 404)
    throw new Error("Word not found. Write your own sentence and definition.");
  if (!response.ok)
    throw new Error(
      "Dictionary not available right now. Write your own or try later.",
    );
  const text = await response.text();
  if (text.length > 500000)
    throw new Error("Entry too large. Write your own help.");
  const choices = dictionaryChoices(JSON.parse(text));
  if (!choices.length)
    throw new Error("No definitions available. Write your own help.");
  return choices;
}
