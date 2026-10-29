import type { Family } from "./family";

export const NAVIGATION_KEY = "word-garden-tab-navigation-v1";
export const practiceKey = (id: string) => `word-garden-tab-practice-v1:${id}`;

export function readSession(key: string): unknown {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
export function writeSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be disabled or full. Recovery must never block practice.
  }
}
export type Navigation = {
  profileId: string | null;
  gardenId: string | null;
  creating: boolean;
  archived: boolean;
};
export function recoverNavigation(value: unknown, family: Family): Navigation {
  const fallback: Navigation = {
    profileId: null,
    gardenId: null,
    creating: false,
    archived: false,
  };
  if (!value || typeof value !== "object") return fallback;
  const state = value as Partial<Navigation>;
  if (!family.profiles.some((p) => p.id === state.profileId)) return fallback;
  const garden = family.gardens.find(
    (g) => g.id === state.gardenId && g.profileId === state.profileId,
  );
  return {
    profileId: state.profileId!,
    gardenId: state.creating === true ? null : (garden?.id ?? null),
    creating: state.creating === true,
    archived: state.archived === true,
  };
}
export type PracticeSession = {
  view: "home" | "editor" | "play";
  mode: "grow" | "learn";
  title: string;
  list: string;
  helpedWord: number | null;
  soundsEnabled: boolean;
};
export function recoverPractice(
  value: unknown,
  initialEditor: boolean,
): PracticeSession {
  const fallback: PracticeSession = {
    view: initialEditor ? "editor" : "home",
    mode: "grow",
    title: "",
    list: "",
    helpedWord: null,
    soundsEnabled: true,
  };
  if (!value || typeof value !== "object") return fallback;
  const state = value as Partial<PracticeSession>;
  if (
    !["home", "editor", "play"].includes(state.view ?? "") ||
    !["grow", "learn"].includes(state.mode ?? "") ||
    typeof state.title !== "string" ||
    state.title.length > 60 ||
    typeof state.list !== "string" ||
    state.list.length > 30000 ||
    !(
      state.helpedWord === null ||
      (Number.isInteger(state.helpedWord) &&
        state.helpedWord! >= 0 &&
        state.helpedWord! < 100)
    ) ||
    typeof state.soundsEnabled !== "boolean"
  )
    return fallback;
  return {
    ...state,
    view: initialEditor ? "editor" : state.view,
  } as PracticeSession;
}
