import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createAnswerSounds } from "./answerSounds";

describe("answerSounds", () => {
  let mockGain: {
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let mockOscillator: {
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let mockAudioContext: {
    state: "suspended" | "running" | "closed";
    currentTime: number;
    destination: object;
    createOscillator: ReturnType<typeof vi.fn>;
    createGain: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockOscillator = {
      type: "",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
      onended: null,
      disconnect: vi.fn(),
    };

    mockAudioContext = {
      state: "running",
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => ({ ...mockOscillator })),
      createGain: vi.fn(() => ({ ...mockGain })),
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    };

    vi.stubGlobal("window", {
      AudioContext: function () {
        return mockAudioContext;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("correct answer - ascending three sine tones", () => {
    it("plays three sine wave frequencies in ascending order", async () => {
      const sounds = createAnswerSounds();
      await sounds.play(true);

      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3);
    });

    it("uses correct frequencies [523.25, 659.25, 783.99] for correct answer", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);

      expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
        523.25,
        expect.any(Number),
      );
      expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
        659.25,
        expect.any(Number),
      );
      expect(oscillators[2].frequency.setValueAtTime).toHaveBeenCalledWith(
        783.99,
        expect.any(Number),
      );
    });

    it("sets correct answer volume to 0.09", async () => {
      const sounds = createAnswerSounds();
      const gains: any[] = [];
      mockAudioContext.createGain = vi.fn(() => {
        const gain = { ...mockGain };
        gains.push(gain);
        return gain;
      });

      await sounds.play(true);

      gains.forEach((gain) => {
        expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
          0.09,
          expect.any(Number),
        );
      });
    });

    it("uses sine wave oscillator type", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);

      oscillators.forEach((osc) => {
        expect(osc.type).toBe("sine");
      });
    });
  });

  describe("incorrect answer - descending two tones, softer", () => {
    it("plays two sine wave frequencies in descending order", async () => {
      const sounds = createAnswerSounds();
      await sounds.play(false);

      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(2);
    });

    it("uses correct frequencies [329.63, 261.63] for incorrect answer", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(false);

      expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
        329.63,
        expect.any(Number),
      );
      expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
        261.63,
        expect.any(Number),
      );
    });

    it("sets incorrect answer volume to 0.045 (half of correct)", async () => {
      const sounds = createAnswerSounds();
      const gains: any[] = [];
      mockAudioContext.createGain = vi.fn(() => {
        const gain = { ...mockGain };
        gains.push(gain);
        return gain;
      });

      await sounds.play(false);

      gains.forEach((gain) => {
        expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
          0.045,
          expect.any(Number),
        );
      });
    });
  });

  describe("context/resume handling", () => {
    it("creates context on first play if window is available", async () => {
      const sounds = createAnswerSounds();
      await sounds.play(true);

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it("resumes suspended context", async () => {
      mockAudioContext.state = "suspended";
      const sounds = createAnswerSounds();
      await sounds.play(true);

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it("reuses context across multiple plays", async () => {
      const sounds = createAnswerSounds();
      await sounds.play(true);
      const firstCallCount =
        mockAudioContext.createOscillator.mock.calls.length;

      await sounds.play(false);

      expect(
        mockAudioContext.createOscillator.mock.calls.length,
      ).toBeGreaterThan(firstCallCount);
    });

    it("returns early if context is closed", async () => {
      const sounds = createAnswerSounds();
      mockAudioContext.state = "closed";
      mockAudioContext.createOscillator = vi.fn();

      await sounds.play(true);

      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe("unsupported/throwing audio - no rejection", () => {
    it("catches and ignores error during play", async () => {
      const sounds = createAnswerSounds();
      mockAudioContext.createOscillator = vi.fn(() => {
        throw new Error("AudioContext not supported");
      });

      expect(async () => await sounds.play(true)).not.toThrow();
    });

    it("handles missing window gracefully", async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal("window", undefined as any);
      const sounds = createAnswerSounds();

      expect(async () => await sounds.play(true)).not.toThrow();
    });

    it("handles missing AudioContext gracefully", async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal("window", {});

      const sounds = createAnswerSounds();

      expect(async () => await sounds.play(true)).not.toThrow();
    });
  });

  describe("cancel pending resume and stop", () => {
    it("stops active oscillators", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);
      sounds.stop();

      oscillators.forEach((osc) => {
        expect(osc.stop).toHaveBeenCalled();
      });
    });

    it("clears active oscillators on stop", async () => {
      const sounds = createAnswerSounds();
      await sounds.play(true);
      sounds.stop();

      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);

      // After stop, new play should not affect old oscillators
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it("ignores errors when stopping already-stopped oscillators", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        osc.stop = vi.fn(() => {
          throw new Error("Already stopped");
        });
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);

      expect(() => sounds.stop()).not.toThrow();
    });
  });

  describe("dispose cleanup", () => {
    it("stops all oscillators on dispose", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);
      sounds.dispose();

      oscillators.forEach((osc) => {
        expect(osc.stop).toHaveBeenCalled();
      });
    });

    it("closes audio context on dispose", async () => {
      const sounds = createAnswerSounds();
      await sounds.play(true);
      sounds.dispose();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it("handles close errors silently", async () => {
      const sounds = createAnswerSounds();
      mockAudioContext.close = vi.fn(() =>
        Promise.reject(new Error("Close failed")),
      );

      await sounds.play(true);

      expect(() => sounds.dispose()).not.toThrow();
    });

    it("nullifies context after dispose", async () => {
      const sounds = createAnswerSounds();
      await sounds.play(true);
      sounds.dispose();

      mockAudioContext.createOscillator = vi.fn();
      await sounds.play(true);

      // Should recreate context on next play after dispose
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });
  });

  describe("oscillator lifecycle and onended cleanup", () => {
    it("registers onended handler for each oscillator", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);

      oscillators.forEach((osc) => {
        expect(osc.onended).toBeDefined();
      });
    });

    it("disconnects oscillator and gain on onended", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      const gains: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });
      mockAudioContext.createGain = vi.fn(() => {
        const gain = { ...mockGain };
        gains.push(gain);
        return gain;
      });

      await sounds.play(true);

      // Trigger onended for first oscillator
      if (oscillators[0].onended) {
        oscillators[0].onended();
      }

      expect(oscillators[0].disconnect).toHaveBeenCalled();
      expect(gains[0].disconnect).toHaveBeenCalled();
    });
  });

  describe("generation/cancellation", () => {
    it.each(["stop", "dispose"] as const)(
      "cancels pending resume on %s",
      async (action) => {
        const sounds = createAnswerSounds();
        let resume!: () => void;
        mockAudioContext.state = "suspended";
        mockAudioContext.resume = vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resume = resolve;
            }),
        );
        const playing = sounds.play(true);
        sounds[action]();
        mockAudioContext.state = "running";
        resume();
        await playing;
        expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
      },
    );
    it("cancels pending plays with new play call", async () => {
      const sounds = createAnswerSounds();
      const oscillators: any[] = [];
      mockAudioContext.createOscillator = vi.fn(() => {
        const osc = { ...mockOscillator };
        oscillators.push(osc);
        return osc;
      });

      await sounds.play(true);
      await sounds.play(false);

      expect(oscillators[0].stop).toHaveBeenCalled();
    });
  });
});
