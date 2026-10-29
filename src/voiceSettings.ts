export const SETTINGS_KEY = "word-garden-voice-settings-v1";

export type VoiceSettings = {
  version: 1;
  engine: "device" | "kokoro";
  voiceId: string;
  rate: number;
  remoteAllowed: boolean;
  autoPrepare: boolean;
};

const SUPPORTED_RATES = [0.7, 0.9, 1.0];
const MAX_VOICE_ID_LENGTH = 500;

export const defaultVoiceSettings: VoiceSettings = {
  version: 1,
  engine: "device",
  voiceId: "",
  rate: 0.9,
  remoteAllowed: false,
  autoPrepare: false,
};

export function isValidVoiceSettings(value: unknown): value is VoiceSettings {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check version
  if (obj.version !== 1) {
    return false;
  }

  // Check engine
  if (obj.engine !== "device" && obj.engine !== "kokoro") {
    return false;
  }

  // Check voiceId
  if (typeof obj.voiceId !== "string") {
    return false;
  }
  if (obj.voiceId.length > MAX_VOICE_ID_LENGTH) {
    return false;
  }

  // Check rate
  if (typeof obj.rate !== "number") {
    return false;
  }
  if (!SUPPORTED_RATES.includes(obj.rate)) {
    return false;
  }

  // Check remoteAllowed
  if (typeof obj.remoteAllowed !== "boolean") {
    return false;
  }

  // Check autoPrepare
  if (typeof obj.autoPrepare !== "boolean") {
    return false;
  }

  return true;
}

export function parseVoiceSettings(value: unknown): VoiceSettings | null {
  if (isValidVoiceSettings(value)) {
    return value;
  }
  return null;
}

export function mergeVoiceSettings(
  partial: Partial<VoiceSettings>,
): VoiceSettings {
  return {
    ...defaultVoiceSettings,
    ...partial,
    version: 1, // always lock version
  };
}
