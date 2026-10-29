// Device voices are not a neural-model replacement. Filter novelty voices and
// prefer ordinary narration voices, while retaining a usable English fallback.
const novelty =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Trinoids|Whisper|Wobble|Zarvox)$/i;
export function childFriendlyVoices<
  T extends Pick<SpeechSynthesisVoice, "name" | "lang" | "localService">,
>(voices: T[], remoteAllowed: boolean): T[] {
  const english = voices.filter(
    (v) => /^en(?:-|$)/i.test(v.lang) && (v.localService || remoteAllowed),
  );
  const ordinary = english.filter((v) => !novelty.test(v.name));
  return ordinary;
}
export function chooseVoice<
  T extends Pick<SpeechSynthesisVoice, "name" | "lang" | "voiceURI">,
>(voices: T[], preferred: string): T | undefined {
  return (
    voices.find((v) => v.voiceURI === preferred) ??
    voices.find((v) =>
      /^(Samantha|Microsoft Aria|Google US English)/i.test(v.name),
    ) ??
    voices.find((v) => v.lang.toLowerCase() === "en-us") ??
    voices[0]
  );
}
