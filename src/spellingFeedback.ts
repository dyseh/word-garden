import { normalize } from "./game";

export type AlignmentKind = "match" | "replace" | "missing" | "extra";

export interface Alignment {
  expected: string;
  actual: string;
  kind: AlignmentKind;
}

/**
 * Compute edit distance between two strings using Levenshtein algorithm.
 * Returns the DP table for deterministic backtracking.
 */
function levenshteinDP(expected: string, attempt: string): number[][] {
  const m = expected.length;
  const n = attempt.length;

  // dp[i][j] = edit distance between expected[0..i-1] and attempt[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );

  // Base cases: convert empty string to target
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i; // delete i characters from expected
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j; // insert j characters to match attempt
  }

  // Fill the table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (expected[i - 1] === attempt[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // match, no cost
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j], // delete from expected
            dp[i][j - 1], // insert into attempt
            dp[i - 1][j - 1], // replace
          );
      }
    }
  }

  return dp;
}

/**
 * Backtrack through the DP table deterministically to produce alignments.
 * When multiple operations have the same cost, prefer: match > replace > delete > insert.
 */
function backtrackAlignments(
  expected: string,
  attempt: string,
  dp: number[][],
): Alignment[] {
  const alignments: Alignment[] = [];
  let i = expected.length;
  let j = attempt.length;

  while (i > 0 || j > 0) {
    if (i === 0) {
      // Only attempt chars left: all extra
      alignments.unshift({
        expected: "",
        actual: attempt[j - 1],
        kind: "extra",
      });
      j--;
    } else if (j === 0) {
      // Only expected chars left: all missing
      alignments.unshift({
        expected: expected[i - 1],
        actual: "",
        kind: "missing",
      });
      i--;
    } else {
      const current = dp[i][j];
      const diagonal = dp[i - 1][j - 1];
      const up = dp[i - 1][j];
      const left = dp[i][j - 1];

      if (expected[i - 1] === attempt[j - 1]) {
        // Match: no cost change
        alignments.unshift({
          expected: expected[i - 1],
          actual: attempt[j - 1],
          kind: "match",
        });
        i--;
        j--;
      } else if (current === diagonal + 1) {
        // Replace (prefer over delete/insert)
        alignments.unshift({
          expected: expected[i - 1],
          actual: attempt[j - 1],
          kind: "replace",
        });
        i--;
        j--;
      } else if (current === up + 1) {
        // Delete from expected (missing in attempt)
        alignments.unshift({
          expected: expected[i - 1],
          actual: "",
          kind: "missing",
        });
        i--;
      } else if (current === left + 1) {
        // Insert into expected (extra in attempt)
        alignments.unshift({
          expected: "",
          actual: attempt[j - 1],
          kind: "extra",
        });
        j--;
      }
    }
  }

  return alignments;
}

/**
 * Align expected spelling with actual attempt using Levenshtein distance.
 * Normalizes both strings (trim, lowercase, apostrophes).
 * Returns detailed character-by-character alignment for child-friendly feedback UI.
 * Filters out matching characters (only returns errors for UI display).
 */
export function alignSpelling(
  expected: string,
  attempt: string,
  includeMatches = false,
): Alignment[] {
  const exp = normalize(expected);
  const att = normalize(attempt);

  // Empty cases
  if (!exp && !att) return [];
  if (!exp) {
    return att.split("").map((char) => ({
      expected: "",
      actual: char,
      kind: "extra",
    }));
  }
  if (!att) {
    return exp.split("").map((char) => ({
      expected: char,
      actual: "",
      kind: "missing",
    }));
  }

  // Compute DP table and backtrack
  const dp = levenshteinDP(exp, att);
  const alignments = backtrackAlignments(exp, att, dp);

  // Filter out matches for cleaner UI feedback - only show errors
  return includeMatches
    ? alignments
    : alignments.filter((a) => a.kind !== "match");
}
