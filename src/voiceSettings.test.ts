import { describe, it, expect } from "vitest";
import {
  SETTINGS_KEY,
  VoiceSettings,
  defaultVoiceSettings,
  isValidVoiceSettings,
  parseVoiceSettings,
  mergeVoiceSettings,
} from "./voiceSettings";

describe("voiceSettings", () => {
  describe("SETTINGS_KEY", () => {
    it("exports the correct storage key", () => {
      expect(SETTINGS_KEY).toBe("word-garden-voice-settings-v1");
    });
  });

  describe("defaultVoiceSettings", () => {
    it("has device engine", () => {
      expect(defaultVoiceSettings.engine).toBe("device");
    });

    it("has empty voiceId", () => {
      expect(defaultVoiceSettings.voiceId).toBe("");
    });

    it("has rate 0.9", () => {
      expect(defaultVoiceSettings.rate).toBe(0.9);
    });

    it("has remoteAllowed false", () => {
      expect(defaultVoiceSettings.remoteAllowed).toBe(false);
    });

    it("has autoPrepare false", () => {
      expect(defaultVoiceSettings.autoPrepare).toBe(false);
    });

    it("has version 1", () => {
      expect(defaultVoiceSettings.version).toBe(1);
    });
  });

  describe("isValidVoiceSettings", () => {
    const validSettings: VoiceSettings = {
      version: 1,
      engine: "kokoro",
      voiceId: "voice-123",
      rate: 0.7,
      remoteAllowed: true,
      autoPrepare: true,
    };

    describe("valid cases", () => {
      it("accepts valid settings with device engine", () => {
        expect(
          isValidVoiceSettings({
            version: 1,
            engine: "device",
            voiceId: "default",
            rate: 0.9,
            remoteAllowed: false,
            autoPrepare: false,
          }),
        ).toBe(true);
      });

      it("accepts valid settings with kokoro engine", () => {
        expect(isValidVoiceSettings(validSettings)).toBe(true);
      });

      it("accepts empty voiceId", () => {
        expect(
          isValidVoiceSettings({
            version: 1,
            engine: "device",
            voiceId: "",
            rate: 0.9,
            remoteAllowed: false,
            autoPrepare: false,
          }),
        ).toBe(true);
      });

      it("accepts voiceId at max length (500 chars)", () => {
        const longVoiceId = "a".repeat(500);
        expect(
          isValidVoiceSettings({
            version: 1,
            engine: "kokoro",
            voiceId: longVoiceId,
            rate: 1.0,
            remoteAllowed: true,
            autoPrepare: true,
          }),
        ).toBe(true);
      });

      it("accepts all supported rates", () => {
        [0.7, 0.9, 1.0].forEach((rate) => {
          expect(
            isValidVoiceSettings({
              version: 1,
              engine: "device",
              voiceId: "test",
              rate,
              remoteAllowed: false,
              autoPrepare: false,
            }),
          ).toBe(true);
        });
      });

      it("accepts both boolean values for remoteAllowed", () => {
        [true, false].forEach((remoteAllowed) => {
          expect(
            isValidVoiceSettings({
              version: 1,
              engine: "device",
              voiceId: "test",
              rate: 0.9,
              remoteAllowed,
              autoPrepare: false,
            }),
          ).toBe(true);
        });
      });

      it("accepts both boolean values for autoPrepare", () => {
        [true, false].forEach((autoPrepare) => {
          expect(
            isValidVoiceSettings({
              version: 1,
              engine: "device",
              voiceId: "test",
              rate: 0.9,
              remoteAllowed: false,
              autoPrepare,
            }),
          ).toBe(true);
        });
      });
    });

    describe("invalid version", () => {
      it("rejects version 0", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            version: 0,
          } as unknown),
        ).toBe(false);
      });

      it("rejects version 2", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            version: 2,
          } as unknown),
        ).toBe(false);
      });

      it("rejects missing version", () => {
        const { version, ...rest } = validSettings;
        expect(isValidVoiceSettings(rest)).toBe(false);
      });

      it("rejects string version", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            version: "1",
          } as unknown),
        ).toBe(false);
      });
    });

    describe("invalid engine", () => {
      it("rejects invalid engine type", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            engine: "invalid",
          }),
        ).toBe(false);
      });

      it("rejects number engine", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            engine: 1,
          } as unknown),
        ).toBe(false);
      });

      it("rejects missing engine", () => {
        const { engine, ...rest } = validSettings;
        expect(isValidVoiceSettings(rest)).toBe(false);
      });
    });

    describe("invalid voiceId", () => {
      it("rejects voiceId over max length (501 chars)", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            voiceId: "a".repeat(501),
          }),
        ).toBe(false);
      });

      it("rejects non-string voiceId", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            voiceId: 123,
          } as unknown),
        ).toBe(false);
      });

      it("rejects null voiceId", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            voiceId: null,
          } as unknown),
        ).toBe(false);
      });

      it("rejects missing voiceId", () => {
        const { voiceId, ...rest } = validSettings;
        expect(isValidVoiceSettings(rest)).toBe(false);
      });
    });

    describe("invalid rate", () => {
      it("rejects unsupported rate 0.5", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            rate: 0.5,
          }),
        ).toBe(false);
      });

      it("rejects unsupported rate 1.5", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            rate: 1.5,
          }),
        ).toBe(false);
      });

      it("rejects string rate", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            rate: "0.9",
          } as unknown),
        ).toBe(false);
      });

      it("rejects missing rate", () => {
        const { rate, ...rest } = validSettings;
        expect(isValidVoiceSettings(rest)).toBe(false);
      });

      it("rejects NaN rate", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            rate: NaN,
          }),
        ).toBe(false);
      });

      it("rejects Infinity rate", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            rate: Infinity,
          }),
        ).toBe(false);
      });
    });

    describe("invalid remoteAllowed", () => {
      it("rejects non-boolean remoteAllowed", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            remoteAllowed: 1,
          } as unknown),
        ).toBe(false);
      });

      it('rejects string "true" for remoteAllowed', () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            remoteAllowed: "true",
          } as unknown),
        ).toBe(false);
      });

      it("rejects missing remoteAllowed", () => {
        const { remoteAllowed, ...rest } = validSettings;
        expect(isValidVoiceSettings(rest)).toBe(false);
      });
    });

    describe("invalid autoPrepare", () => {
      it("rejects non-boolean autoPrepare", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            autoPrepare: 0,
          } as unknown),
        ).toBe(false);
      });

      it('rejects string "false" for autoPrepare', () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            autoPrepare: "false",
          } as unknown),
        ).toBe(false);
      });

      it("rejects missing autoPrepare", () => {
        const { autoPrepare, ...rest } = validSettings;
        expect(isValidVoiceSettings(rest)).toBe(false);
      });
    });

    describe("type and structure edge cases", () => {
      it("rejects null", () => {
        expect(isValidVoiceSettings(null)).toBe(false);
      });

      it("rejects undefined", () => {
        expect(isValidVoiceSettings(undefined)).toBe(false);
      });

      it("rejects primitive string", () => {
        expect(isValidVoiceSettings("settings")).toBe(false);
      });

      it("rejects primitive number", () => {
        expect(isValidVoiceSettings(123)).toBe(false);
      });

      it("rejects array", () => {
        expect(isValidVoiceSettings([validSettings])).toBe(false);
      });

      it("rejects object with extra fields", () => {
        expect(
          isValidVoiceSettings({
            ...validSettings,
            extra: "field",
          }),
        ).toBe(true); // extra fields are allowed
      });
    });
  });

  describe("parseVoiceSettings", () => {
    it("returns valid settings", () => {
      const settings = {
        version: 1,
        engine: "kokoro" as const,
        voiceId: "test",
        rate: 0.7,
        remoteAllowed: true,
        autoPrepare: false,
      };
      expect(parseVoiceSettings(settings)).toEqual(settings);
    });

    it("returns null for invalid settings", () => {
      expect(parseVoiceSettings({ version: 2 })).toBeNull();
    });

    it("returns null for null input", () => {
      expect(parseVoiceSettings(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(parseVoiceSettings(undefined)).toBeNull();
    });

    it("returns null for string input", () => {
      expect(parseVoiceSettings("not settings")).toBeNull();
    });
  });

  describe("mergeVoiceSettings", () => {
    it("returns defaults when no partial provided", () => {
      expect(mergeVoiceSettings({})).toEqual(defaultVoiceSettings);
    });

    it("merges partial engine override", () => {
      expect(mergeVoiceSettings({ engine: "kokoro" })).toEqual({
        ...defaultVoiceSettings,
        engine: "kokoro",
      });
    });

    it("merges partial voiceId override", () => {
      expect(mergeVoiceSettings({ voiceId: "custom" })).toEqual({
        ...defaultVoiceSettings,
        voiceId: "custom",
      });
    });

    it("merges partial rate override", () => {
      expect(mergeVoiceSettings({ rate: 0.7 })).toEqual({
        ...defaultVoiceSettings,
        rate: 0.7,
      });
    });

    it("merges partial remoteAllowed override", () => {
      expect(mergeVoiceSettings({ remoteAllowed: true })).toEqual({
        ...defaultVoiceSettings,
        remoteAllowed: true,
      });
    });

    it("merges partial autoPrepare override", () => {
      expect(mergeVoiceSettings({ autoPrepare: true })).toEqual({
        ...defaultVoiceSettings,
        autoPrepare: true,
      });
    });

    it("merges multiple partial overrides", () => {
      expect(
        mergeVoiceSettings({
          engine: "kokoro",
          voiceId: "custom",
          rate: 1.0,
          remoteAllowed: true,
        }),
      ).toEqual({
        version: 1,
        engine: "kokoro",
        voiceId: "custom",
        rate: 1.0,
        remoteAllowed: true,
        autoPrepare: false,
      });
    });

    it("always enforces version 1", () => {
      expect(
        mergeVoiceSettings({ version: 2 } as unknown as Partial<VoiceSettings>),
      ).toEqual({
        ...defaultVoiceSettings,
        version: 1,
      });
    });
  });
});
