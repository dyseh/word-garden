import { Game, validGame } from "./game";

export const AVATARS = [
  "fox",
  "bunny",
  "cat",
  "frog",
  "bear",
  "owl",
  "bee",
  "penguin",
] as const;

export type AvatarId = (typeof AVATARS)[number];

export interface Profile {
  id: string;
  name: string;
  avatar: AvatarId;
}

export interface SavedGarden {
  id: string;
  profileId: string;
  game: Game;
  archived: boolean;
}

export interface Family {
  version: 2;
  profiles: Profile[];
  gardens: SavedGarden[];
}

export const FAMILY_KEY = "word-garden-family-v2";

/**
 * Create an empty family structure.
 */
export function emptyFamily(): Family {
  return {
    version: 2,
    profiles: [],
    gardens: [],
  };
}

/**
 * Validate a family structure with strict constraints.
 * Returns true if valid, false otherwise.
 */
export function validFamily(value: unknown): value is Family {
  if (!value || typeof value !== "object") return false;

  const f = value as Family;

  // Check version
  if (f.version !== 2) return false;

  // Check profiles array
  if (!Array.isArray(f.profiles) || f.profiles.length > 30) return false;

  // Validate each profile
  if (
    !f.profiles.every(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        p.id.length > 0 &&
        p.id.length <= 100 &&
        typeof p.name === "string" &&
        p.name.trim().length > 0 &&
        p.name.trim().length <= 24 &&
        p.name === p.name.trim() &&
        typeof p.avatar === "string" &&
        AVATARS.includes(p.avatar as AvatarId),
    )
  )
    return false;

  // Check unique profile IDs
  const profileIds = f.profiles.map((p) => p.id);
  if (new Set(profileIds).size !== profileIds.length) return false;

  // Check gardens array
  if (!Array.isArray(f.gardens) || f.gardens.length > 300) return false;

  // Validate each garden
  if (
    !f.gardens.every(
      (g) =>
        g &&
        typeof g === "object" &&
        typeof g.id === "string" &&
        g.id.length > 0 &&
        g.id.length <= 100 &&
        typeof g.profileId === "string" &&
        g.profileId.length > 0 &&
        g.profileId.length <= 100 &&
        profileIds.includes(g.profileId) &&
        validGame(g.game) &&
        typeof g.archived === "boolean",
    )
  )
    return false;

  // Check unique garden IDs
  const gardenIds = f.gardens.map((g) => g.id);
  if (new Set(gardenIds).size !== gardenIds.length) return false;

  return true;
}

/**
 * Migrate legacy data structure to Family v2.
 * Expects legacy format with structure like:
 * { "legacy-profile": Game, "legacy-garden": Game, ... }
 *
 * Returns migrated Family if conversion succeeds, null if input is invalid.
 * Does not mutate the input.
 */
export function migrateLegacy(unknown: unknown): Family | null {
  if (validGame(unknown))
    return {
      version: 2,
      profiles: [{ id: "legacy-profile", name: "Gardener 1", avatar: "fox" }],
      gardens: [
        {
          id: "legacy-garden",
          profileId: "legacy-profile",
          game: structuredClone(unknown),
          archived: false,
        },
      ],
    };
  if (!unknown || typeof unknown !== "object") return null;

  const legacy = unknown as Record<string, unknown>;

  // Migrate each game found in legacy structure
  let gardenIndex = 0;
  const gardens: SavedGarden[] = [];
  for (const [, value] of Object.entries(legacy)) {
    if (validGame(value)) {
      const garden: SavedGarden = {
        id: `legacy-garden-${gardenIndex}`,
        profileId: "legacy-profile",
        game: structuredClone(value),
        archived: false,
      };
      gardens.push(garden);
      gardenIndex++;
    }
  }

  // Return null if no valid games found
  if (gardens.length === 0) return null;

  // Create family with single profile and migrated gardens
  const family: Family = {
    version: 2,
    profiles: [
      {
        id: "legacy-profile",
        name: "Gardener 1",
        avatar: "fox",
      },
    ],
    gardens,
  };

  // Validate the result
  if (!validFamily(family)) return null;

  return family;
}

/**
 * Add a new profile to the family.
 * Throws if the family is invalid, max profiles exceeded, or constraints violated.
 * Does not mutate the input family.
 */
export function addProfile(
  family: Family,
  name: string,
  avatar: AvatarId,
  id: string,
): Family {
  // Validate inputs
  if (!family || typeof family !== "object" || family.version !== 2) {
    throw new Error("Invalid family");
  }
  if (typeof id !== "string" || id.length === 0 || id.length > 100) {
    throw new Error("Invalid profile id");
  }
  if (typeof name !== "string" || name !== name.trim()) {
    throw new Error("Profile name must not have leading/trailing whitespace");
  }
  if (name.trim().length === 0 || name.length > 24) {
    throw new Error("Profile name must be nonempty and at most 24 characters");
  }
  if (!AVATARS.includes(avatar)) {
    throw new Error("Invalid avatar");
  }

  // Check max profiles
  if (family.profiles.length >= 30) {
    throw new Error("Maximum 30 profiles allowed");
  }

  // Check for duplicate id
  if (family.profiles.some((p) => p.id === id)) {
    throw new Error("Profile id already exists");
  }

  // Create new family with added profile
  const newFamily: Family = {
    ...family,
    profiles: [
      ...family.profiles,
      {
        id,
        name,
        avatar,
      },
    ],
  };

  if (!validFamily(newFamily)) {
    throw new Error("Invalid family after adding profile");
  }

  return newFamily;
}

/**
 * Update an existing profile in the family.
 * Throws if profile not found or constraints violated.
 * Does not mutate the input family.
 */
export function updateProfile(
  family: Family,
  id: string,
  name: string,
  avatar: AvatarId,
): Family {
  // Validate inputs
  if (!family || typeof family !== "object" || family.version !== 2) {
    throw new Error("Invalid family");
  }
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Invalid profile id");
  }
  if (typeof name !== "string" || name !== name.trim()) {
    throw new Error("Profile name must not have leading/trailing whitespace");
  }
  if (name.trim().length === 0 || name.length > 24) {
    throw new Error("Profile name must be nonempty and at most 24 characters");
  }
  if (!AVATARS.includes(avatar)) {
    throw new Error("Invalid avatar");
  }

  // Find profile
  const profileIndex = family.profiles.findIndex((p) => p.id === id);
  if (profileIndex === -1) {
    throw new Error("Profile not found");
  }

  // Create new family with updated profile
  const newProfiles = [...family.profiles];
  newProfiles[profileIndex] = { id, name, avatar };

  const newFamily: Family = {
    ...family,
    profiles: newProfiles,
  };

  if (!validFamily(newFamily)) {
    throw new Error("Invalid family after updating profile");
  }

  return newFamily;
}

/**
 * Remove a profile from the family.
 * Cascades: removes all gardens owned by this profile.
 * Throws if profile not found.
 * Does not mutate the input family.
 */
export function removeProfile(family: Family, id: string): Family {
  // Validate inputs
  if (!family || typeof family !== "object" || family.version !== 2) {
    throw new Error("Invalid family");
  }
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Invalid profile id");
  }

  // Check profile exists
  const profileIndex = family.profiles.findIndex((p) => p.id === id);
  if (profileIndex === -1) {
    throw new Error("Profile not found");
  }

  // Create new family with removed profile and cascading garden removal
  const newFamily: Family = {
    ...family,
    profiles: family.profiles.filter((p) => p.id !== id),
    gardens: family.gardens.filter((g) => g.profileId !== id),
  };

  if (!validFamily(newFamily)) {
    throw new Error("Invalid family after removing profile");
  }

  return newFamily;
}

/**
 * Add a new garden to the family.
 * Throws if profile doesn't exist or constraints violated.
 * Does not mutate the input family.
 */
export function addGarden(
  family: Family,
  profileId: string,
  game: Game,
  id: string,
): Family {
  // Validate inputs
  if (!family || typeof family !== "object" || family.version !== 2) {
    throw new Error("Invalid family");
  }
  if (typeof id !== "string" || id.length === 0 || id.length > 100) {
    throw new Error("Invalid garden id");
  }
  if (typeof profileId !== "string" || profileId.length === 0) {
    throw new Error("Invalid profile id");
  }
  if (!validGame(game)) {
    throw new Error("Invalid game");
  }

  // Check max gardens
  if (family.gardens.length >= 300) {
    throw new Error("Maximum 300 gardens allowed");
  }

  // Check profile exists
  if (!family.profiles.some((p) => p.id === profileId)) {
    throw new Error("Profile not found");
  }

  // Check for duplicate garden id
  if (family.gardens.some((g) => g.id === id)) {
    throw new Error("Garden id already exists");
  }

  // Create new family with added garden
  const newFamily: Family = {
    ...family,
    gardens: [
      ...family.gardens,
      {
        id,
        profileId,
        game,
        archived: false,
      },
    ],
  };

  if (!validFamily(newFamily)) {
    throw new Error("Invalid family after adding garden");
  }

  return newFamily;
}

/**
 * Update an existing garden's game state.
 * Keeps the profile ownership unchanged.
 * Throws if garden not found or constraints violated.
 * Does not mutate the input family.
 */
export function updateGarden(family: Family, id: string, game: Game): Family {
  // Validate inputs
  if (!family || typeof family !== "object" || family.version !== 2) {
    throw new Error("Invalid family");
  }
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Invalid garden id");
  }
  if (!validGame(game)) {
    throw new Error("Invalid game");
  }

  // Find garden
  const gardenIndex = family.gardens.findIndex((g) => g.id === id);
  if (gardenIndex === -1) {
    throw new Error("Garden not found");
  }

  // Create new family with updated garden (keep profile ownership and archived state)
  const newGardens = [...family.gardens];
  newGardens[gardenIndex] = {
    ...family.gardens[gardenIndex],
    game,
  };

  const newFamily: Family = {
    ...family,
    gardens: newGardens,
  };

  if (!validFamily(newFamily)) {
    throw new Error("Invalid family after updating garden");
  }

  return newFamily;
}

/**
 * Set the archived state of a garden.
 * Throws if garden not found.
 * Does not mutate the input family.
 */
export function setArchived(
  family: Family,
  id: string,
  archived: boolean,
): Family {
  // Validate inputs
  if (!family || typeof family !== "object" || family.version !== 2) {
    throw new Error("Invalid family");
  }
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Invalid garden id");
  }
  if (typeof archived !== "boolean") {
    throw new Error("Invalid archived value");
  }

  // Find garden
  const gardenIndex = family.gardens.findIndex((g) => g.id === id);
  if (gardenIndex === -1) {
    throw new Error("Garden not found");
  }

  // Create new family with updated archived state
  const newGardens = [...family.gardens];
  newGardens[gardenIndex] = {
    ...family.gardens[gardenIndex],
    archived,
  };

  const newFamily: Family = {
    ...family,
    gardens: newGardens,
  };

  if (!validFamily(newFamily)) {
    throw new Error("Invalid family after setting archived state");
  }

  return newFamily;
}
