/** Short, local-only tones. Audio failure must never interrupt spelling practice. */
export function createAnswerSounds() {
  let context: AudioContext | null = null;
  let generation = 0;
  const active = new Set<OscillatorNode>();

  function stop() {
    generation++;
    for (const oscillator of active) {
      try {
        oscillator.stop();
      } catch {
        // The tone may already have finished.
      }
    }
    active.clear();
  }

  async function play(correct: boolean) {
    stop();
    const request = generation;
    try {
      if (!context || context.state === "closed") {
        if (typeof window === "undefined") return;
        const Audio =
          window.AudioContext ??
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
      }
      const audio = context;
      if (audio.state === "suspended") await audio.resume();
      if (request !== generation || audio.state !== "running") return;
      const notes = correct ? [523.25, 659.25, 783.99] : [329.63, 261.63];
      const volume = correct ? 0.09 : 0.045;
      notes.forEach((frequency, index) => {
        const start = audio.currentTime + index * 0.12;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.02);
        gain.gain.linearRampToValueAtTime(0, start + 0.2);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.onended = () => {
          active.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        active.add(oscillator);
        oscillator.start(start);
        oscillator.stop(start + 0.21);
      });
    } catch {
      stop();
    }
  }

  function dispose() {
    stop();
    if (context && context.state !== "closed")
      void context.close().catch(() => {});
    context = null;
  }

  return { play, stop, dispose };
}
