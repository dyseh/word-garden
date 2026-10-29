/** Give isolated words a sentence boundary for neural prosody.
 * This is a pronunciation mitigation, not a guarantee of exact generated speech.
 * No article, carrier phrase or new vocabulary is added. Sentence content stays intact.
 */
export function kokoroSegmentText(
  text: string,
  index: number,
  count: number,
): string {
  const clean = text.trim();
  if (!clean || (index !== 0 && index !== count - 1)) return clean;
  const initialCapital = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(initialCapital) ? initialCapital : `${initialCapital}.`;
}
