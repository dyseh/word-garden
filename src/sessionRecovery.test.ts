import { afterEach, describe, expect, it, vi } from "vitest";
import {
  recoverNavigation,
  recoverPractice,
  readSession,
  writeSession,
  practiceKey,
} from "./sessionRecovery";
import { demo } from "./game";
import type { Family } from "./family";
const family: Family = {
  version: 2,
  profiles: [
    { id: "p", name: "One", avatar: "fox" },
    { id: "q", name: "Two", avatar: "cat" },
  ],
  gardens: [{ id: "g", profileId: "p", game: demo, archived: false }],
};
afterEach(() => vi.unstubAllGlobals());
describe("reload recovery", () => {
  it("restores an owned garden", () =>
    expect(
      recoverNavigation({ profileId: "p", gardenId: "g" }, family).gardenId,
    ).toBe("g"));
  it("rejects a garden belonging to another child", () =>
    expect(
      recoverNavigation({ profileId: "q", gardenId: "g" }, family).gardenId,
    ).toBeNull());
  it("rejects a deleted profile", () =>
    expect(
      recoverNavigation({ profileId: "deleted", creating: true }, family),
    ).toEqual({
      profileId: null,
      gardenId: null,
      creating: false,
      archived: false,
    }));
  it("restores a new-list editor without a garden", () =>
    expect(
      recoverNavigation(
        { profileId: "p", gardenId: "g", creating: true },
        family,
      ),
    ).toEqual({
      profileId: "p",
      gardenId: null,
      creating: true,
      archived: false,
    }));
  it("handles malformed session values", () => {
    for (const value of [null, 2, "bad", {}, []])
      expect(recoverPractice(value, true).view).toBe("editor");
  });
  const state = {
    view: "play",
    mode: "grow",
    title: "Words",
    list: "sun\nleaf",
    helpedWord: 0,
    soundsEnabled: false,
  };
  it("preserves practice mode, mute, draft, and assisted status", () =>
    expect(recoverPractice(state, false)).toEqual(state));
  it("forces editor for an unplanted garden", () =>
    expect(recoverPractice(state, true).view).toBe("editor"));
  it.each([
    { title: "x".repeat(61) },
    { list: "x".repeat(30001) },
    { helpedWord: -1 },
    { helpedWord: 100 },
    { mode: "bad" },
    { view: "bad" },
  ])("rejects invalid fields %s", (bad) =>
    expect(recoverPractice({ ...state, ...bad }, false).view).toBe("home"),
  );
  it("separates garden session keys", () =>
    expect(practiceKey("one")).not.toBe(practiceKey("two")));
  it("tolerates blocked storage", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("quota");
      },
    });
    expect(readSession("key")).toBeNull();
    expect(() => writeSession("key", state)).not.toThrow();
  });
  it("ignores malformed JSON", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "{" });
    expect(readSession("key")).toBeNull();
  });
});
