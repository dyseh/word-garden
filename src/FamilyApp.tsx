import { useEffect, useRef, useState } from "react";
import { get, set, entries, setMany } from "idb-keyval";
import App from "./App";
import Garden from "./Garden";
import ProfileAvatar from "./ProfileAvatar";
import { useNaturalVoice } from "./useNaturalVoice";
import { demo, validGame, type Game } from "./game";
import {
  AVATARS,
  FAMILY_KEY,
  emptyFamily,
  validFamily,
  migrateLegacy,
  addProfile,
  updateProfile,
  removeProfile,
  addGarden,
  updateGarden,
  setArchived,
  type AvatarId,
  type Family,
} from "./family";
import { helpKey, validHelp, type ApprovedHelp } from "./dictionary";
import "./family.css";
import "./familyLayout.css";
let writes: Promise<unknown> = Promise.resolve();
const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function FamilyApp() {
  const [family, setFamily] = useState<Family>(emptyFamily),
    [loaded, setLoaded] = useState(false),
    [fatal, setFatal] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("Loading…");
  const [profileId, setProfileId] = useState<string | null>(null),
    [gardenId, setGardenId] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [archived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<string | null | undefined>(undefined),
    [name, setName] = useState(""),
    [avatar, setAvatar] = useState<AvatarId>("fox"),
    [dialogError, setDialogError] = useState("");
  const [backupBusy, setBackupBusy] = useState(false),
    [notice, setNotice] = useState("");
  const naturalVoice = useNaturalVoice();
  const dialog = useRef<HTMLDialogElement>(null),
    backupInput = useRef<HTMLInputElement>(null);
  const latest = useRef(family);
  latest.current = family;
  const revision = useRef(0);
  const owner = useRef<string | null>(null);
  const profile = family.profiles.find((p) => p.id === profileId),
    selected = family.gardens.find(
      (g) => g.id === gardenId && g.profileId === profileId,
    );
  owner.current = selected?.id ?? null;
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let value = await get(FAMILY_KEY);
        if (value === undefined) {
          const legacy = await get("word-garden-v1");
          if (legacy !== undefined) {
            value = migrateLegacy(legacy);
            if (!value)
              throw new Error(
                "Your old garden could not be read. Nothing has been overwritten.",
              );
            setNotice(
              "Your old garden is in Gardener 1. You can change the name and picture.",
            );
          } else value = emptyFamily();
          await set(FAMILY_KEY, value);
        }
        if (!validFamily(value))
          throw new Error(
            "Saved profiles could not be read. Nothing has been overwritten. Restore a family backup below.",
          );
        if (alive) {
          setFamily(value);
          setSaved("Saved on this device");
        }
      } catch (e) {
        if (alive)
          setFatal(
            e instanceof Error
              ? e.message
              : "Could not open saved profiles. Try reloading this page.",
          );
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (editing !== undefined) dialog.current?.showModal();
  }, [editing]);
  function commit(next: Family) {
    if (!validFamily(next))
      throw new Error("These changes could not be saved.");
    latest.current = next;
    setFamily(next);
    revision.current++;
    const current = revision.current;
    setSaved("Saving…");
    writes = writes.catch(() => {}).then(() => set(FAMILY_KEY, next));
    void writes
      .then(() => {
        if (revision.current === current) {
          setSaved("Saved on this device");
          setError("");
        }
      })
      .catch(() => {
        if (revision.current === current) {
          setSaved("Not saved");
          setError(
            "This browser could not save your changes. Export a family backup before closing it.",
          );
        }
      });
  }
  function leave() {
    naturalVoice.cancel();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    owner.current = null;
    setGardenId(null);
    setCreating(false);
  }
  function chooseProfile(pid: string) {
    leave();
    setProfileId(pid);
    setShowArchived(false);
    setError("");
  }
  function picker() {
    leave();
    setProfileId(null);
    setShowArchived(false);
  }
  function editProfile(pid: string | null) {
    const p = family.profiles.find((p) => p.id === pid);
    setName(p?.name ?? "");
    setAvatar(p?.avatar ?? "fox");
    setDialogError("");
    setEditing(pid);
  }
  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!name.trim()) throw new Error("Add a nickname.");
      const pid = editing ?? id();
      commit(
        editing
          ? updateProfile(latest.current, pid, name.trim(), avatar)
          : addProfile(latest.current, name.trim(), avatar, pid),
      );
      setEditing(undefined);
      chooseProfile(pid);
    } catch (e) {
      setDialogError(
        e instanceof Error ? e.message : "Could not save this gardener.",
      );
    }
  }
  function createGarden(game: Game) {
    if (!profile) return;
    const gid = id();
    commit(addGarden(latest.current, profile.id, game, gid));
    setCreating(false);
    setGardenId(gid);
  }
  function changeGame(gid: string, game: Game) {
    if (owner.current !== gid) return;
    try {
      commit(updateGarden(latest.current, gid, game));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this garden.");
    }
  }
  function renameGarden(gid: string) {
    const garden = family.gardens.find((g) => g.id === gid);
    if (!garden) return;
    const title = window.prompt("Garden name", garden.game.title);
    if (title === null) return;
    if (!title.trim() || title.trim().length > 60) {
      setError("Use a garden name between 1 and 60 characters.");
      return;
    }
    commit(
      updateGarden(latest.current, gid, {
        ...garden.game,
        title: title.trim(),
      }),
    );
  }
  async function exportFamily() {
    setBackupBusy(true);
    try {
      const help = (await entries())
        .filter(
          ([k, v]) =>
            typeof k === "string" &&
            k.startsWith("word-garden-word-help-v1:") &&
            validHelp(v, (v as ApprovedHelp).word),
        )
        .map(([, v]) => v);
      download(
        {
          format: "word-garden-family",
          version: 1,
          family: latest.current,
          wordHelp: help,
        },
        "word-garden-family.json",
      );
    } catch {
      download(
        {
          format: "word-garden-family",
          version: 1,
          family: latest.current,
          wordHelp: [],
        },
        "word-garden-family.json",
      );
      setError(
        "Gardens were exported, but saved word help could not be included.",
      );
    } finally {
      setBackupBusy(false);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    setBackupBusy(true);
    setError("");
    try {
      if (file.size > 10000000) throw new Error("Choose a backup under 10 MB.");
      const value: unknown = JSON.parse(await file.text());
      if (validGame(value)) {
        if (!profile)
          throw new Error(
            "Choose a gardener first, then import this garden backup.",
          );
        createGarden(value);
        return;
      }
      const envelope = value as {
        format?: string;
        version?: number;
        family?: unknown;
        wordHelp?: unknown;
      };
      let restored: Family;
      let help: ApprovedHelp[] = [];
      if (validFamily(value)) restored = value;
      else {
        if (
          envelope?.format !== "word-garden-family" ||
          envelope.version !== 1 ||
          !validFamily(envelope.family) ||
          !Array.isArray(envelope.wordHelp) ||
          envelope.wordHelp.length > 10000
        )
          throw new Error("This is not a valid family backup.");
        restored = envelope.family;
        help = envelope.wordHelp;
        if (
          !help.every(
            (v) => v && typeof v.word === "string" && validHelp(v, v.word),
          )
        )
          throw new Error("The word help in this backup is invalid.");
      }
      if (
        !window.confirm(
          "Replace all gardeners and gardens on this device with this backup? Export your current family first if you want to keep it.",
        )
      )
        return;
      leave();
      await writes.catch(() => {});
      await setMany([
        [FAMILY_KEY, restored],
        ...help.map((h) => [helpKey(h.word), h] as [string, ApprovedHelp]),
      ]);
      revision.current++;
      latest.current = restored;
      setFamily(restored);
      setFatal("");
      setProfileId(null);
      setSaved("Saved on this device");
      setNotice("Family backup restored.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the backup.");
    } finally {
      setBackupBusy(false);
      if (backupInput.current) backupInput.current.value = "";
    }
  }
  const owned = family.gardens.filter((g) => g.profileId === profileId),
    visible = owned.filter((g) => g.archived === archived);
  return (
    <>
      {(selected || creating) && profile ? (
        <>
          <nav className="profile-switch-bar" aria-label="Current gardener">
            <div className="profile-switch-bar-content">
              <div className="profile-switch-bar-active">
                <ProfileAvatar avatar={profile.avatar} size={44} />
                <div>
                  <strong>{profile.name}</strong>
                  <span className="family-active-title">
                    {creating ? "New garden" : selected?.game.title}
                  </span>
                </div>
              </div>
              <div className="profile-switch-bar-actions">
                <button
                  className="button button-light button-small"
                  onClick={leave}
                >
                  My gardens
                </button>
                <button
                  className="button button-light button-small"
                  onClick={picker}
                >
                  Switch gardener
                </button>
              </div>
            </div>
          </nav>
          <App
            key={creating ? `new-${profile.id}` : selected!.id}
            game={selected?.game ?? demo}
            onGameChange={(game) => {
              if (selected) changeGame(selected.id, game);
            }}
            onCreateGarden={createGarden}
            onBack={leave}
            initialEditor={creating}
            saved={saved}
            storageError={error}
            naturalVoice={naturalVoice}
          />
        </>
      ) : (
        <main className="family-shell">
          <header className="family-header">
            <button type="button" className="family-brand" onClick={picker}>
              word<span>garden</span>
            </button>
            <div className="family-header-actions">
              <span className="family-device-note">Saved on this device</span>
            </div>
          </header>
          {!loaded ? (
            <div className="family-empty">
              <h1>Opening your gardens…</h1>
            </div>
          ) : (
            <>
              {fatal && (
                <p className="family-error" role="alert">
                  {fatal}
                </p>
              )}
              {error && (
                <p className="family-error" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="family-status" role="status">
                  {notice}
                </p>
              )}
              {!fatal && !profile ? (
                <>
                  <section className="family-intro">
                    <span className="pixel-label">EVERYONE GETS A GARDEN</span>
                    <h1>Who’s ready to spell?</h1>
                    <p>Pick your picture to find your words.</p>
                  </section>
                  <section className="profile-grid" aria-label="Gardeners">
                    {family.profiles.map((p) => {
                      const gardens = family.gardens.filter(
                        (g) => g.profileId === p.id && !g.archived,
                      );
                      return (
                        <button
                          type="button"
                          className="profile-card"
                          key={p.id}
                          onClick={() => chooseProfile(p.id)}
                          aria-label={`Open ${p.name}'s gardens`}
                        >
                          <ProfileAvatar avatar={p.avatar} size={104} />
                          <h2 className="profile-card-name">{p.name}</h2>
                          <p className="profile-card-tagline">
                            {gardens.length}{" "}
                            {gardens.length === 1 ? "garden" : "gardens"}
                          </p>
                          <span className="profile-card-button">
                            My gardens
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="profile-card profile-add"
                      disabled={family.profiles.length >= 30}
                      onClick={() => editProfile(null)}
                    >
                      <span className="profile-plus" aria-hidden="true">
                        +
                      </span>
                      <strong>Add a gardener</strong>
                      <span>Choose a name and picture</span>
                    </button>
                  </section>
                  <p className="family-small-note">
                    Each gardener has their own words and progress. No account
                    needed.
                  </p>
                </>
              ) : !fatal && profile ? (
                <>
                  <section className="family-toolbar">
                    <div className="family-person">
                      <ProfileAvatar avatar={profile.avatar} size={80} />
                      <div>
                        <span className="pixel-label">YOUR GARDENS</span>
                        <h1>{profile.name}’s gardens</h1>
                        <p>Pick a list and keep growing.</p>
                      </div>
                    </div>
                    <div className="family-actions">
                      <button className="button button-light" onClick={picker}>
                        Switch gardener
                      </button>
                      <button
                        className="button button-primary"
                        onClick={() => {
                          leave();
                          setCreating(true);
                        }}
                      >
                        New garden
                      </button>
                    </div>
                  </section>
                  <div className="family-subnav">
                    <button
                      className="text-button"
                      onClick={() => editProfile(profile.id)}
                    >
                      Edit name & picture
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setShowArchived((v) => !v)}
                    >
                      {archived
                        ? "Show my gardens"
                        : `Saved away (${owned.filter((g) => g.archived).length})`}
                    </button>
                  </div>
                  {!visible.length ? (
                    <section className="family-empty">
                      <h2>
                        {archived
                          ? "No gardens saved away."
                          : "Your first garden starts here."}
                      </h2>
                      <p>
                        {archived
                          ? "You can save older gardens away without deleting them."
                          : "Add your school words or try a practice list."}
                      </p>
                      {!archived && (
                        <div className="family-actions">
                          <button
                            className="button button-primary"
                            onClick={() => setCreating(true)}
                          >
                            Add my words
                          </button>
                          <button
                            className="button button-light"
                            onClick={() => createGarden(structuredClone(demo))}
                          >
                            Try a practice garden
                          </button>
                        </div>
                      )}
                    </section>
                  ) : (
                    <section
                      className="family-gardens"
                      aria-label="Saved gardens"
                    >
                      {visible.map((g) => (
                        <article className="family-garden-card" key={g.id}>
                          <div className="family-garden-scene">
                            <Garden
                              total={g.game.words.length}
                              grown={g.game.grown.length}
                            />
                          </div>
                          <div className="family-garden-body">
                            <h2>{g.game.title}</h2>
                            <p>
                              {g.game.grown.length} of {g.game.words.length}{" "}
                              words grown · Round {g.game.round}
                            </p>
                            <button
                              className="button button-primary"
                              onClick={() => {
                                setGardenId(g.id);
                                setCreating(false);
                              }}
                            >
                              {g.game.queue.length === 0
                                ? "View garden"
                                : g.game.attempts
                                  ? "Continue"
                                  : "Start spelling"}
                            </button>
                            <div className="family-card-actions">
                              <button
                                className="text-button"
                                onClick={() => renameGarden(g.id)}
                              >
                                Rename
                              </button>
                              <button
                                className="text-button"
                                onClick={() =>
                                  commit(
                                    setArchived(
                                      latest.current,
                                      g.id,
                                      !g.archived,
                                    ),
                                  )
                                }
                              >
                                {g.archived ? "Bring back" : "Save away"}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </section>
                  )}
                </>
              ) : null}
              <footer className="family-footer">
                <details>
                  <summary>Grown-up tools</summary>
                  <p className="field-help">
                    Profiles stay in this browser. They don’t sync to other
                    devices and aren’t password-protected. Voice settings and
                    word help are shared.
                  </p>
                  <div className="family-actions">
                    <button
                      type="button"
                      className="button button-light"
                      disabled={backupBusy || !!fatal}
                      onClick={() => void exportFamily()}
                    >
                      Export family backup
                    </button>
                    <button
                      type="button"
                      className="button button-light"
                      disabled={backupBusy}
                      onClick={() => backupInput.current?.click()}
                    >
                      Import backup
                    </button>
                    {profile && (
                      <button
                        type="button"
                        className="text-button family-delete"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete ${profile.name} and all ${owned.length} of their gardens? This cannot be undone. Export a family backup first if you want to keep them.`,
                            )
                          ) {
                            commit(removeProfile(latest.current, profile.id));
                            picker();
                          }
                        }}
                      >
                        Delete {profile.name}’s profile
                      </button>
                    )}
                  </div>
                  <input
                    hidden
                    ref={backupInput}
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => void restore(e.target.files?.[0])}
                  />
                </details>
                <span role="status">{saved}</span>
              </footer>
            </>
          )}
        </main>
      )}
      {editing !== undefined && (
        <dialog
          ref={dialog}
          className="family-dialog"
          aria-labelledby="profile-title"
          onCancel={() => setEditing(undefined)}
        >
          <form onSubmit={saveProfile}>
            <h2 id="profile-title">
              {editing ? "Edit your gardener" : "Make your gardener"}
            </h2>
            <label htmlFor="profile-name">Nickname</label>
            <input
              autoFocus
              id="profile-name"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              autoComplete="off"
            />
            <fieldset className="avatar-fieldset">
              <legend>Choose your picture</legend>
              <div className="avatar-grid">
                {AVATARS.map((value) => (
                  <button
                    type="button"
                    className="avatar-grid-button"
                    aria-label={value}
                    aria-pressed={avatar === value}
                    key={value}
                    onClick={() => setAvatar(value)}
                  >
                    <ProfileAvatar avatar={value} size={64} />
                    <span>{value}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {dialogError && (
              <p className="family-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="family-actions">
              <button
                type="button"
                className="button button-light"
                onClick={() => setEditing(undefined)}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                Save gardener
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
