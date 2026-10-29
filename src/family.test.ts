import { describe, it, expect } from "vitest";
import {
  AVATARS,
  FAMILY_KEY,
  addGarden,
  addProfile,
  emptyFamily,
  migrateLegacy,
  removeProfile,
  setArchived,
  updateGarden,
  updateProfile,
  validFamily,
  type AvatarId,
  type Family,
  type Profile,
} from "./family";
import { demo, newGame as createGame, parseWords } from "./game";

describe("family", () => {
  describe("exports", () => {
    it("AVATARS is readonly and contains all 8 avatars", () => {
      expect(AVATARS).toEqual([
        "fox",
        "bunny",
        "cat",
        "frog",
        "bear",
        "owl",
        "bee",
        "penguin",
      ]);
      expect(AVATARS.length).toBe(8);
    });

    it("FAMILY_KEY is set correctly", () => {
      expect(FAMILY_KEY).toBe("word-garden-family-v2");
    });
  });

  describe("emptyFamily()", () => {
    it("creates a valid empty family", () => {
      const family = emptyFamily();
      expect(family).toEqual({
        version: 2,
        profiles: [],
        gardens: [],
      });
      expect(validFamily(family)).toBe(true);
    });

    it("returns a new instance each time", () => {
      const f1 = emptyFamily();
      const f2 = emptyFamily();
      expect(f1).not.toBe(f2);
    });
  });

  describe("validFamily()", () => {
    it("rejects null and undefined", () => {
      expect(validFamily(null)).toBe(false);
      expect(validFamily(undefined)).toBe(false);
    });

    it("rejects non-objects", () => {
      expect(validFamily("not an object")).toBe(false);
      expect(validFamily(123)).toBe(false);
      expect(validFamily([])).toBe(false);
    });

    it("rejects wrong version", () => {
      expect(validFamily({ version: 1, profiles: [], gardens: [] })).toBe(
        false,
      );
      expect(validFamily({ version: 3, profiles: [], gardens: [] })).toBe(
        false,
      );
    });

    it("rejects missing profiles or gardens array", () => {
      expect(validFamily({ version: 2 })).toBe(false);
      expect(validFamily({ version: 2, profiles: [] })).toBe(false);
      expect(validFamily({ version: 2, gardens: [] })).toBe(false);
    });

    it("rejects profiles array with more than 30 items", () => {
      const family = emptyFamily();
      for (let i = 0; i < 31; i++) {
        family.profiles.push({
          id: `profile-${i}`,
          name: `Gardener ${i}`,
          avatar: "fox",
        });
      }
      expect(validFamily(family)).toBe(false);
    });

    it("accepts exactly 30 profiles", () => {
      const family = emptyFamily();
      for (let i = 0; i < 30; i++) {
        family.profiles.push({
          id: `profile-${i}`,
          name: `Gardener ${i}`,
          avatar: AVATARS[i % AVATARS.length],
        });
      }
      expect(validFamily(family)).toBe(true);
    });

    it("rejects gardens array with more than 300 items", () => {
      const family = emptyFamily();
      family.profiles.push({
        id: "profile-0",
        name: "Gardener",
        avatar: "fox",
      });
      for (let i = 0; i < 301; i++) {
        family.gardens.push({
          id: `garden-${i}`,
          profileId: "profile-0",
          game: demo,
          archived: false,
        });
      }
      expect(validFamily(family)).toBe(false);
    });

    it("accepts exactly 300 gardens", () => {
      const family = emptyFamily();
      family.profiles.push({
        id: "profile-0",
        name: "Gardener",
        avatar: "fox",
      });
      for (let i = 0; i < 300; i++) {
        family.gardens.push({
          id: `garden-${i}`,
          profileId: "profile-0",
          game: demo,
          archived: false,
        });
      }
      expect(validFamily(family)).toBe(true);
    });

    describe("profile validation", () => {
      it("rejects profile with missing id, name, or avatar", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ name: "Test", avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(false);
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(false);
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", name: "Test" }],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("rejects profile with empty id", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "", name: "Test", avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("rejects profile with id longer than 100 characters", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [
              {
                id: "x".repeat(101),
                name: "Test",
                avatar: "fox",
              },
            ],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("accepts profile with id exactly 100 characters", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [
              {
                id: "x".repeat(100),
                name: "Test",
                avatar: "fox",
              },
            ],
            gardens: [],
          }),
        ).toBe(true);
      });

      it("rejects profile with empty name", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", name: "", avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("rejects profile with whitespace-only name", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", name: "   ", avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("rejects profile with untrimmed name", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", name: " Test ", avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("rejects profile with name longer than 24 characters", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", name: "x".repeat(25), avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("accepts profile with name exactly 24 characters", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", name: "x".repeat(24), avatar: "fox" }],
            gardens: [],
          }),
        ).toBe(true);
      });

      it("rejects profile with invalid avatar", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [{ id: "1", name: "Test", avatar: "dragon" }],
            gardens: [],
          }),
        ).toBe(false);
      });

      it("accepts profile with each valid avatar", () => {
        for (const avatar of AVATARS) {
          expect(
            validFamily({
              version: 2,
              profiles: [{ id: "1", name: "Test", avatar }],
              gardens: [],
            }),
          ).toBe(true);
        }
      });

      it("rejects duplicate profile ids", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [
              { id: "same", name: "Test1", avatar: "fox" },
              { id: "same", name: "Test2", avatar: "bunny" },
            ],
            gardens: [],
          }),
        ).toBe(false);
      });
    });

    describe("garden validation", () => {
      const validProfile: Profile = { id: "p1", name: "Test", avatar: "fox" };

      it("rejects garden with missing id, profileId, game, or archived", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [{ profileId: "p1", game: demo, archived: false }],
          }),
        ).toBe(false);
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [{ id: "g1", game: demo, archived: false }],
          }),
        ).toBe(false);
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [{ id: "g1", profileId: "p1", archived: false }],
          }),
        ).toBe(false);
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [{ id: "g1", profileId: "p1", game: demo }],
          }),
        ).toBe(false);
      });

      it("rejects garden with empty id", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [{ id: "", profileId: "p1", game: demo, archived: false }],
          }),
        ).toBe(false);
      });

      it("rejects garden with id longer than 100 characters", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [
              {
                id: "x".repeat(101),
                profileId: "p1",
                game: demo,
                archived: false,
              },
            ],
          }),
        ).toBe(false);
      });

      it("accepts garden with id exactly 100 characters", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [
              {
                id: "x".repeat(100),
                profileId: "p1",
                game: demo,
                archived: false,
              },
            ],
          }),
        ).toBe(true);
      });

      it("rejects garden with empty profileId", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [{ id: "g1", profileId: "", game: demo, archived: false }],
          }),
        ).toBe(false);
      });

      it("rejects garden with profileId longer than 100 characters", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [
              {
                id: "g1",
                profileId: "x".repeat(101),
                game: demo,
                archived: false,
              },
            ],
          }),
        ).toBe(false);
      });

      it("rejects garden with invalid game", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [
              {
                id: "g1",
                profileId: "p1",
                game: { version: 1, title: "", words: [] },
                archived: false,
              },
            ],
          }),
        ).toBe(false);
      });

      it("rejects garden with non-boolean archived", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [
              { id: "g1", profileId: "p1", game: demo, archived: "no" },
            ],
          }),
        ).toBe(false);
      });

      it("rejects garden referencing non-existent profile", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [
              {
                id: "g1",
                profileId: "nonexistent",
                game: demo,
                archived: false,
              },
            ],
          }),
        ).toBe(false);
      });

      it("rejects duplicate garden ids", () => {
        expect(
          validFamily({
            version: 2,
            profiles: [validProfile],
            gardens: [
              { id: "same", profileId: "p1", game: demo, archived: false },
              { id: "same", profileId: "p1", game: demo, archived: true },
            ],
          }),
        ).toBe(false);
      });
    });
  });

  describe("migrateLegacy()", () => {
    it("migrates the actual single-game v1 storage without sharing references", () => {
      const original = structuredClone(demo);
      const migrated = migrateLegacy(original)!;
      expect(migrated.profiles[0].name).toBe("Gardener 1");
      expect(migrated.gardens[0].id).toBe("legacy-garden");
      expect(migrated.gardens[0].game).toEqual(original);
      migrated.gardens[0].game.title = "Changed";
      expect(original.title).toBe(demo.title);
    });
    it("returns null for null input", () => {
      expect(migrateLegacy(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(migrateLegacy(undefined)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(migrateLegacy("not an object")).toBeNull();
      expect(migrateLegacy(123)).toBeNull();
      expect(migrateLegacy([])).toBeNull();
    });

    it("returns null for empty object", () => {
      expect(migrateLegacy({})).toBeNull();
    });

    it("migrates legacy game to Family with one profile and one garden", () => {
      const family = migrateLegacy({ "legacy-game": demo });
      expect(family).not.toBeNull();
      expect(family!.version).toBe(2);
      expect(family!.profiles).toHaveLength(1);
      expect(family!.profiles[0].id).toBe("legacy-profile");
      expect(family!.profiles[0].name).toBe("Gardener 1");
      expect(family!.profiles[0].avatar).toBe("fox");
      expect(family!.gardens).toHaveLength(1);
      expect(family!.gardens[0].id).toBe("legacy-garden-0");
      expect(family!.gardens[0].profileId).toBe("legacy-profile");
      expect(family!.gardens[0].archived).toBe(false);
    });

    it("migrates multiple legacy games deeply (no mutation)", () => {
      const words1 = parseWords("apple | An apple\nbanana | A banana");
      const words2 = parseWords("cat | A cat\ndog | A dog");
      const game1 = createGame(words1, "Fruits");
      const game2 = createGame(words2, "Animals");

      const legacy = { game1, game2 };
      const family = migrateLegacy(legacy);

      expect(family).not.toBeNull();
      expect(family!.profiles).toHaveLength(1);
      expect(family!.gardens).toHaveLength(2);
      expect(family!.gardens[0].game).toEqual(game1);
      expect(family!.gardens[1].game).toEqual(game2);

      // Verify no mutation of original
      expect(legacy.game1).toEqual(game1);
      expect(legacy.game2).toEqual(game2);
    });

    it("skips non-game entries in legacy data", () => {
      const legacy = {
        validGame: demo,
        notAGame: { title: "invalid" },
        randomString: "hello",
        number: 42,
      };
      const family = migrateLegacy(legacy);
      expect(family).not.toBeNull();
      expect(family!.gardens).toHaveLength(1);
      expect(family!.gardens[0].game).toEqual(demo);
    });

    it("validates migrated result", () => {
      const family = migrateLegacy({ game: demo });
      expect(validFamily(family)).toBe(true);
    });
  });

  describe("addProfile()", () => {
    it("adds profile to empty family", () => {
      const family = emptyFamily();
      const updated = addProfile(family, "Alice", "fox", "p1");

      expect(updated.profiles).toHaveLength(1);
      expect(updated.profiles[0]).toEqual({
        id: "p1",
        name: "Alice",
        avatar: "fox",
      });
      expect(validFamily(updated)).toBe(true);
    });

    it("does not mutate input family", () => {
      const family = emptyFamily();
      const updated = addProfile(family, "Alice", "fox", "p1");

      expect(family.profiles).toHaveLength(0);
      expect(updated.profiles).toHaveLength(1);
    });

    it("throws when family is invalid", () => {
      expect(() =>
        addProfile(null as unknown as Family, "Alice", "fox", "p1"),
      ).toThrow("Invalid family");
      expect(() =>
        addProfile({ version: 1 } as unknown as Family, "Alice", "fox", "p1"),
      ).toThrow("Invalid family");
    });

    it("throws when id is empty", () => {
      const family = emptyFamily();
      expect(() => addProfile(family, "Alice", "fox", "")).toThrow(
        "Invalid profile id",
      );
    });

    it("throws when id is longer than 100 characters", () => {
      const family = emptyFamily();
      expect(() => addProfile(family, "Alice", "fox", "x".repeat(101))).toThrow(
        "Invalid profile id",
      );
    });

    it("accepts id exactly 100 characters", () => {
      const family = emptyFamily();
      const updated = addProfile(family, "Alice", "fox", "x".repeat(100));
      expect(updated.profiles).toHaveLength(1);
    });

    it("throws when name has leading/trailing whitespace", () => {
      const family = emptyFamily();
      expect(() => addProfile(family, " Alice", "fox", "p1")).toThrow(
        "must not have leading/trailing whitespace",
      );
      expect(() => addProfile(family, "Alice ", "fox", "p1")).toThrow(
        "must not have leading/trailing whitespace",
      );
    });

    it("throws when name is empty or whitespace-only", () => {
      const family = emptyFamily();
      expect(() => addProfile(family, "", "fox", "p1")).toThrow(
        "must be nonempty",
      );
      expect(() => addProfile(family, "   ", "fox", "p1")).toThrow(
        "must not have leading/trailing whitespace",
      );
    });

    it("throws when name is longer than 24 characters", () => {
      const family = emptyFamily();
      expect(() => addProfile(family, "x".repeat(25), "fox", "p1")).toThrow(
        "at most 24 characters",
      );
    });

    it("accepts name exactly 24 characters", () => {
      const family = emptyFamily();
      const updated = addProfile(family, "x".repeat(24), "fox", "p1");
      expect(updated.profiles).toHaveLength(1);
    });

    it("throws when avatar is invalid", () => {
      const family = emptyFamily();
      expect(() =>
        addProfile(family, "Alice", "dragon" as AvatarId, "p1"),
      ).toThrow("Invalid avatar");
    });

    it("throws when max profiles (30) exceeded", () => {
      let family = emptyFamily();
      for (let i = 0; i < 30; i++) {
        family = addProfile(
          family,
          `Gardener ${i}`,
          AVATARS[i % AVATARS.length],
          `p${i}`,
        );
      }
      expect(() => addProfile(family, "Too Many", "fox", "p30")).toThrow(
        "Maximum 30 profiles allowed",
      );
    });

    it("throws when profile id already exists", () => {
      const family = emptyFamily();
      const updated = addProfile(family, "Alice", "fox", "p1");
      expect(() => addProfile(updated, "Bob", "bunny", "p1")).toThrow(
        "Profile id already exists",
      );
    });
  });

  describe("updateProfile()", () => {
    it("updates profile name and avatar", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = updateProfile(family, "p1", "Alicia", "bunny");

      expect(family.profiles[0]).toEqual({
        id: "p1",
        name: "Alicia",
        avatar: "bunny",
      });
      expect(validFamily(family)).toBe(true);
    });

    it("does not mutate input family", () => {
      const family = addProfile(emptyFamily(), "Alice", "fox", "p1");
      const updated = updateProfile(family, "p1", "Bob", "cat");

      expect(family.profiles[0].name).toBe("Alice");
      expect(updated.profiles[0].name).toBe("Bob");
    });

    it("throws when family is invalid", () => {
      expect(() =>
        updateProfile(null as unknown as Family, "p1", "Alice", "fox"),
      ).toThrow("Invalid family");
    });

    it("throws when profile id is empty", () => {
      const family = emptyFamily();
      expect(() => updateProfile(family, "", "Alice", "fox")).toThrow(
        "Invalid profile id",
      );
    });

    it("throws when name has leading/trailing whitespace", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() => updateProfile(family, "p1", " Bob", "fox")).toThrow(
        "must not have leading/trailing whitespace",
      );
    });

    it("throws when name is empty", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() => updateProfile(family, "p1", "", "fox")).toThrow(
        "must be nonempty",
      );
    });

    it("throws when name is longer than 24 characters", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() => updateProfile(family, "p1", "x".repeat(25), "fox")).toThrow(
        "at most 24 characters",
      );
    });

    it("throws when avatar is invalid", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() =>
        updateProfile(family, "p1", "Alice", "dragon" as AvatarId),
      ).toThrow("Invalid avatar");
    });

    it("throws when profile not found", () => {
      const family = emptyFamily();
      expect(() =>
        updateProfile(family, "nonexistent", "Alice", "fox"),
      ).toThrow("Profile not found");
    });
  });

  describe("removeProfile()", () => {
    it("removes profile from family", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addProfile(family, "Bob", "bunny", "p2");
      family = removeProfile(family, "p1");

      expect(family.profiles).toHaveLength(1);
      expect(family.profiles[0].id).toBe("p2");
      expect(validFamily(family)).toBe(true);
    });

    it("cascades: removes gardens owned by removed profile", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addProfile(family, "Bob", "bunny", "p2");
      family = addGarden(family, "p1", demo, "g1");
      family = addGarden(family, "p2", demo, "g2");
      family = removeProfile(family, "p1");

      expect(family.gardens).toHaveLength(1);
      expect(family.gardens[0].id).toBe("g2");
      expect(validFamily(family)).toBe(true);
    });

    it("does not mutate input family", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      const updated = removeProfile(family, "p1");

      expect(family.profiles).toHaveLength(1);
      expect(updated.profiles).toHaveLength(0);
    });

    it("throws when family is invalid", () => {
      expect(() => removeProfile(null as unknown as Family, "p1")).toThrow(
        "Invalid family",
      );
    });

    it("throws when profile id is empty", () => {
      const family = emptyFamily();
      expect(() => removeProfile(family, "")).toThrow("Invalid profile id");
    });

    it("throws when profile not found", () => {
      const family = emptyFamily();
      expect(() => removeProfile(family, "nonexistent")).toThrow(
        "Profile not found",
      );
    });
  });

  describe("addGarden()", () => {
    it("adds garden to family", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");

      expect(family.gardens).toHaveLength(1);
      expect(family.gardens[0]).toEqual({
        id: "g1",
        profileId: "p1",
        game: demo,
        archived: false,
      });
      expect(validFamily(family)).toBe(true);
    });

    it("does not mutate input family", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      const updated = addGarden(family, "p1", demo, "g1");

      expect(family.gardens).toHaveLength(0);
      expect(updated.gardens).toHaveLength(1);
    });

    it("throws when family is invalid", () => {
      expect(() =>
        addGarden(null as unknown as Family, "p1", demo, "g1"),
      ).toThrow("Invalid family");
    });

    it("throws when garden id is empty", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() => addGarden(family, "p1", demo, "")).toThrow(
        "Invalid garden id",
      );
    });

    it("throws when garden id is longer than 100 characters", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() => addGarden(family, "p1", demo, "x".repeat(101))).toThrow(
        "Invalid garden id",
      );
    });

    it("throws when profile id is empty", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() => addGarden(family, "", demo, "g1")).toThrow(
        "Invalid profile id",
      );
    });

    it("throws when game is invalid", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      expect(() =>
        addGarden(
          family,
          "p1",
          {
            version: 1,
            title: "",
            words: [],
            queue: [],
            grown: [],
            attempts: 0,
            round: 1,
          } as any,
          "g1",
        ),
      ).toThrow("Invalid game");
    });

    it("throws when max gardens (300) exceeded", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      for (let i = 0; i < 300; i++) {
        family = addGarden(family, "p1", demo, `g${i}`);
      }
      expect(() => addGarden(family, "p1", demo, "g300")).toThrow(
        "Maximum 300 gardens allowed",
      );
    });

    it("throws when profile does not exist", () => {
      const family = emptyFamily();
      expect(() => addGarden(family, "nonexistent", demo, "g1")).toThrow(
        "Profile not found",
      );
    });

    it("throws when garden id already exists", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");
      expect(() => addGarden(family, "p1", demo, "g1")).toThrow(
        "Garden id already exists",
      );
    });
  });

  describe("updateGarden()", () => {
    it("updates garden game state", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");

      const words = parseWords("new | A new word");
      const updatedGame = createGame(words, "Updated");
      family = updateGarden(family, "g1", updatedGame);

      expect(family.gardens[0].game).toEqual(updatedGame);
      expect(family.gardens[0].profileId).toBe("p1");
      expect(family.gardens[0].archived).toBe(false);
      expect(validFamily(family)).toBe(true);
    });

    it("keeps profile ownership unchanged", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addProfile(family, "Bob", "bunny", "p2");
      family = addGarden(family, "p1", demo, "g1");

      const words = parseWords("new | A new word");
      const updatedGame = createGame(words, "Updated");
      family = updateGarden(family, "g1", updatedGame);

      expect(family.gardens[0].profileId).toBe("p1");
    });

    it("does not mutate input family", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");

      const words = parseWords("new | A new word");
      const updatedGame = createGame(words, "Updated");
      const updated = updateGarden(family, "g1", updatedGame);

      expect(family.gardens[0].game).toEqual(demo);
      expect(updated.gardens[0].game).toEqual(updatedGame);
    });

    it("throws when family is invalid", () => {
      expect(() => updateGarden(null as unknown as Family, "g1", demo)).toThrow(
        "Invalid family",
      );
    });

    it("throws when garden id is empty", () => {
      const family = emptyFamily();
      expect(() => updateGarden(family, "", demo)).toThrow("Invalid garden id");
    });

    it("throws when game is invalid", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");
      expect(() =>
        updateGarden(family, "g1", {
          version: 1,
          title: "",
          words: [],
          queue: [],
          grown: [],
          attempts: 0,
          round: 1,
        } as any),
      ).toThrow("Invalid game");
    });

    it("throws when garden not found", () => {
      const family = emptyFamily();
      expect(() => updateGarden(family, "nonexistent", demo)).toThrow(
        "Garden not found",
      );
    });
  });

  describe("setArchived()", () => {
    it("sets garden archived to true", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");
      family = setArchived(family, "g1", true);

      expect(family.gardens[0].archived).toBe(true);
      expect(validFamily(family)).toBe(true);
    });

    it("sets garden archived to false", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");
      family = setArchived(family, "g1", true);
      family = setArchived(family, "g1", false);

      expect(family.gardens[0].archived).toBe(false);
      expect(validFamily(family)).toBe(true);
    });

    it("does not mutate input family", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");
      const updated = setArchived(family, "g1", true);

      expect(family.gardens[0].archived).toBe(false);
      expect(updated.gardens[0].archived).toBe(true);
    });

    it("throws when family is invalid", () => {
      expect(() => setArchived(null as unknown as Family, "g1", true)).toThrow(
        "Invalid family",
      );
    });

    it("throws when garden id is empty", () => {
      const family = emptyFamily();
      expect(() => setArchived(family, "", true)).toThrow("Invalid garden id");
    });

    it("throws when archived is not boolean", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addGarden(family, "p1", demo, "g1");
      expect(() => setArchived(family, "g1", "yes" as any)).toThrow(
        "Invalid archived value",
      );
    });

    it("throws when garden not found", () => {
      const family = emptyFamily();
      expect(() => setArchived(family, "nonexistent", true)).toThrow(
        "Garden not found",
      );
    });
  });

  describe("integration tests", () => {
    it("maintains immutability across complex operations", () => {
      const original = emptyFamily();
      let family = original;

      family = addProfile(family, "Alice", "fox", "p1");
      family = addProfile(family, "Bob", "bunny", "p2");
      family = addGarden(family, "p1", demo, "g1");
      family = addGarden(family, "p2", demo, "g2");
      family = setArchived(family, "g1", true);
      family = updateProfile(family, "p1", "Alicia", "cat");

      expect(original).toEqual(emptyFamily());
      expect(family.profiles).toHaveLength(2);
      expect(family.gardens).toHaveLength(2);
      expect(validFamily(family)).toBe(true);
    });

    it("cross-profile independence: removing one profile preserves others", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");
      family = addProfile(family, "Bob", "bunny", "p2");
      family = addProfile(family, "Charlie", "cat", "p3");
      family = addGarden(family, "p1", demo, "g1");
      family = addGarden(family, "p2", demo, "g2");
      family = addGarden(family, "p3", demo, "g3");

      family = removeProfile(family, "p2");

      expect(family.profiles.map((p) => p.id)).toEqual(["p1", "p3"]);
      expect(family.gardens.map((g) => g.id)).toEqual(["g1", "g3"]);
      expect(validFamily(family)).toBe(true);
    });

    it("update missing profile throws appropriate error", () => {
      let family = emptyFamily();
      family = addProfile(family, "Alice", "fox", "p1");

      expect(() => updateProfile(family, "p2", "Bob", "bunny")).toThrow(
        "Profile not found",
      );
    });

    it("malformed backup data is rejected", () => {
      const malformed = {
        version: 2,
        profiles: [
          { id: "p1", name: "Alice", avatar: "fox" },
          { id: "p2", name: "Bob" }, // missing avatar
        ],
        gardens: [],
      };
      expect(validFamily(malformed)).toBe(false);
    });
  });
});
