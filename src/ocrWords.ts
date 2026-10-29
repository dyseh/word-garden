/**
 * OCR word extraction for school spelling lists.
 * Processes raw OCR text, cleans formatting, deduplicates, and returns candidates for selection.
 */

export const MAX_OCR_CANDIDATES = 200;

const COMMON_WORKSHEET_HEADINGS = new Set([
  "spelling",
  "words",
  "word",
  "list",
  "name",
  "date",
  "week",
  "grade",
  "bonus",
  "challenge",
]);

export interface OcrCandidate {
  text: string;
  selected: boolean;
  needsReview: boolean;
}

/**
 * Extract OCR candidates from raw text, cleaning formatting and normalizing tokens.
 *
 * @param text - Raw OCR text from a spelling list
 * @returns Array of OCR candidates with selection and review flags
 */
export function extractOcrCandidates(
  text: string,
  isWord: (word: string) => boolean,
): OcrCandidate[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const candidates = new Map<string, OcrCandidate>(); // keyed by lowercase for dedup

  // Split by newlines to process line-by-line
  const lines = text.split("\n");

  for (const line of lines) {
    // Remove list-number/bullet prefixes (e.g., "1. ", "- ", "* ", "a) ")
    // Match: digits/letters followed by . ) : or space at line start, OR bullet with space
    const cleaned = line
      .replace(/^\s*(?:\d+[.):]?\s+|[a-z][.)]\s+|[-•*]\s+)/i, "")
      .trim();

    if (!cleaned) {
      continue;
    }

    // Split by whitespace and commas into tokens
    const tokens = cleaned.split(/[\s,]+/).filter((t) => t.length > 0);

    for (let token of tokens) {
      // Trim punctuation around tokens (but preserve internal punctuation like hyphens/apostrophes)
      // Remove leading non-word chars, remove trailing non-word chars (keep letters, digits, hyphens, apostrophes)
      token = token.replace(/[‘’`]/g, "'");
      token = token.replace(/^[^\w\-']+|[^\w\-']+$/g, "");
      // \w is [a-zA-Z0-9_] so we explicitly allow hyphens too

      if (!token) {
        continue;
      }

      // Normalize apostrophes
      token = token.replace(/[‘’`]/g, "'");

      // Skip pure numbering or punctuation
      if (/^[0-9]+$/.test(token) || /^[-']*$/.test(token)) {
        continue;
      }

      const lowerToken = token.toLowerCase();
      if (
        candidates.has(lowerToken) ||
        token.length > 40 ||
        !/^[a-z]+(?:[-'][a-z]+)*$/i.test(token) ||
        !isWord(lowerToken)
      )
        continue;

      // Headings are real words, but should not be selected automatically.
      const needsReview = COMMON_WORKSHEET_HEADINGS.has(lowerToken);
      const selected = !needsReview;

      const candidate = {
        text: token,
        selected,
        needsReview,
      };
      candidates.set(lowerToken, candidate);

      // Safety cap: stop at MAX_OCR_CANDIDATES
      if (candidates.size >= MAX_OCR_CANDIDATES) {
        break;
      }
    }

    if (candidates.size >= MAX_OCR_CANDIDATES) {
      break;
    }
  }

  return Array.from(candidates.values());
}
