/**
 * Speech prompt utilities for word-garden.
 * Handles text segmentation and audio pause concatenation.
 */

/**
 * Pause duration in milliseconds between audio chunks.
 */
export const PAUSE_MS = 900;

/**
 * Maximum allowed audio duration in milliseconds (5 minutes).
 */
const MAX_AUDIO_MS = 5 * 60 * 1000;

/**
 * Trims a string and returns it, or null if it becomes empty.
 */
function trimOrNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Segments a word object into a prompt array.
 *
 * Returns [trimmedWord, trimmedWord] if no sentence is present.
 * Returns [trimmedWord, trimmedSentence, trimmedWord] if both text and sentence are present.
 * Returns [] if text is empty.
 * No synthetic sentences are generated.
 *
 * @param word - Object containing text and optional sentence
 * @returns Array of string segments
 */
export function promptSegments(word: {
  text: string;
  sentence: string;
}): string[] {
  const trimmedWord = trimOrNull(word.text);

  if (!trimmedWord) {
    return [];
  }

  const trimmedSentence = trimOrNull(word.sentence);

  if (trimmedSentence) {
    return [trimmedWord, trimmedSentence, trimmedWord];
  }

  return [trimmedWord, trimmedWord];
}

/**
 * Joins multiple audio chunks with pauses between them.
 *
 * Inserts silence (zeros) BETWEEN chunks only—no leading or trailing silence.
 * Empty chunks are filtered out before processing.
 *
 * @param chunks - Array of Float32Array audio buffers
 * @param sampleRate - Sample rate in Hz (must be a finite positive integer)
 * @param pauseMs - Pause duration in milliseconds (defaults to PAUSE_MS, must be finite non-negative)
 * @returns Concatenated Float32Array with pauses between chunks, or empty array if no valid chunks
 * @throws Error if sampleRate is not a finite positive integer or pauseMs is not finite/non-negative
 * @throws Error if resulting allocation would exceed 5-minute limit
 */
export function joinWithPauses(
  chunks: Float32Array[],
  sampleRate: number,
  pauseMs: number = PAUSE_MS,
): Float32Array {
  // Validate sampleRate: must be a finite positive integer
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    !Number.isInteger(sampleRate)
  ) {
    throw new Error(
      `sampleRate must be a finite positive integer, got ${sampleRate}`,
    );
  }

  // Validate pauseMs: must be finite and non-negative
  if (!Number.isFinite(pauseMs) || pauseMs < 0) {
    throw new Error(`pauseMs must be finite and non-negative, got ${pauseMs}`);
  }

  // Filter out empty chunks
  const validChunks = chunks.filter((chunk) => chunk.length > 0);

  // Return empty array if no valid chunks
  if (validChunks.length === 0) {
    return new Float32Array(0);
  }

  // If only one chunk, return it as-is (no leading/trailing silence)
  if (validChunks.length === 1) {
    return validChunks[0];
  }

  // Calculate pause in samples
  const pauseSamples = Math.round((pauseMs / 1000) * sampleRate);
  const pauseBuffer = new Float32Array(pauseSamples); // zeros by default

  // Calculate total length: sum of all chunks + pauses between them
  const totalSamples =
    validChunks.reduce((sum, chunk) => sum + chunk.length, 0) +
    (validChunks.length - 1) * pauseSamples;

  // Guard against huge allocations: check 5-minute max
  const durationMs = (totalSamples / sampleRate) * 1000;
  if (durationMs > MAX_AUDIO_MS) {
    throw new Error(
      `Resulting audio duration ${durationMs.toFixed(0)}ms exceeds maximum of ${MAX_AUDIO_MS}ms`,
    );
  }

  // Concatenate chunks with pauses between
  const result = new Float32Array(totalSamples);
  let offset = 0;

  for (let i = 0; i < validChunks.length; i++) {
    const chunk = validChunks[i];
    result.set(chunk, offset);
    offset += chunk.length;

    // Add pause after each chunk except the last
    if (i < validChunks.length - 1) {
      result.set(pauseBuffer, offset);
      offset += pauseSamples;
    }
  }

  return result;
}
