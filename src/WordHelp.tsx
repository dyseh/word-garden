import { useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import { coreDictionary } from "./coreDictionary";
import { normalize } from "./game";
import {
  helpKey,
  hideTarget,
  lookupDictionary,
  validHelp,
  type ApprovedHelp,
  type DictionaryChoice,
} from "./dictionary";
import "./wordHelp.css";
export default function WordHelp({
  word,
  onSpeak,
  onStop,
  onReveal,
  disabled,
}: {
  word: { text: string; sentence: string };
  onSpeak: (text: string) => void;
  onStop: () => void;
  onReveal: () => void;
  disabled: boolean;
}) {
  const target = normalize(word.text),
    local = Object.prototype.hasOwnProperty.call(coreDictionary, target)
      ? coreDictionary[target]
      : undefined;
  const [approved, setApproved] = useState<ApprovedHelp | null>(null),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState(""),
    [meaning, setMeaning] = useState(false),
    [open, setOpen] = useState(false);
  const [definition, setDefinition] = useState(""),
    [sentence, setSentence] = useState(""),
    [choices, setChoices] = useState<DictionaryChoice[]>([]),
    [source, setSource] = useState({ source: "", license: "", licenseUrl: "" });
  const [consent, setConsent] = useState(false),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    abort = useRef<AbortController | null>(null);
  const definitionText = approved?.definition || local?.definition || "";
  const sentenceText =
    word.sentence || approved?.sentence || local?.sentence || "";
  useEffect(() => {
    let active = true;
    get(helpKey(target))
      .then((v) => {
        if (active && validHelp(v, target)) setApproved(v);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Saved word help didn't load. The built-in words still work.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, [target]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  function edit() {
    onStop();
    onReveal();
    setDefinition(definitionText);
    setSentence(sentenceText);
    setSource({
      source: approved?.source || "",
      license: approved?.license || "",
      licenseUrl: approved?.licenseUrl || "",
    });
    setChoices([]);
    setConsent(false);
    setError("");
    setOpen(true);
  }
  function close() {
    if (saving) return;
    abort.current?.abort();
    abort.current = null;
    setLoading(false);
    setOpen(false);
  }
  async function lookup() {
    if (!consent) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const result = await lookupDictionary(target, controller.signal);
      if (!controller.signal.aborted) setChoices(result);
    } catch (e) {
      if (abort.current === controller)
        setError(
          controller.signal.aborted
            ? "Lookup stopped or timed out. You can still write your own help."
            : e instanceof Error
              ? e.message
              : "Lookup failed.",
        );
    } finally {
      clearTimeout(timeout);
      if (abort.current === controller) setLoading(false);
    }
  }
  async function save() {
    setSaving(true);
    setError("");
    try {
      if (!definition.trim() && !sentence.trim())
        throw new Error("Add a sentence or a definition before saving.");
      const value: ApprovedHelp = {
        version: 1,
        word: target,
        definition: definition.trim(),
        sentence: sentence.trim(),
        ...source,
      };
      if (!validHelp(value, target))
        throw new Error(
          "Keep the sentence and definition to 250 characters each, including spaces.",
        );
      await set(helpKey(target), value);
      setApproved(value);
      setOpen(false);
      setMessage("Word help saved. Changes stay on this device.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save help.");
    } finally {
      setSaving(false);
    }
  }
  function help(kind: "sentence" | "definition") {
    onStop();
    setMessage("");
    if (kind === "sentence") {
      setMeaning(false);
      if (sentenceText) onSpeak(sentenceText);
      else setMessage("No sentence yet. Ask a grown-up to add one.");
    } else {
      setMeaning(true);
      if (definitionText) onSpeak(definitionText);
      else setMessage("No definition yet. Ask a grown-up to add one.");
    }
  }
  return (
    <section className="word-help" aria-label="Word clues">
      <div className="word-help-buttons">
        <button
          type="button"
          className="button button-light"
          disabled={disabled || !ready}
          onClick={() => help("sentence")}
        >
          Say it in a sentence
        </button>
        <button
          type="button"
          className="button button-light"
          disabled={disabled || !ready}
          onClick={() => help("definition")}
        >
          Definition
        </button>
      </div>
      {meaning && definitionText && (
        <div className="definition-card" role="status">
          <strong>What it means</strong>
          <p>{hideTarget(definitionText, target)}</p>
          {approved?.source && (
            <small>
              Adapted from Wiktionary · {approved.license}. Source links in
              grown-up word help.
            </small>
          )}
        </div>
      )}
      {message && (
        <p className="field-help" role="status">
          {message}
        </p>
      )}
      <button
        type="button"
        className="text-button word-help-edit"
        disabled={!ready}
        onClick={edit}
      >
        Grown-up: edit word help
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="privacy-dialog word-help-dialog"
          aria-labelledby="word-help-title"
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
        >
          <h2 id="word-help-title">Word help: {target}</h2>
          <p>
            This screen shows the answer. The child will need to try this word
            again without looking.
          </p>
          <p className="field-help">
            Write a simple meaning and a sentence with this word. Pick the
            meaning from your school list.
          </p>
          <fieldset disabled={saving}>
            <label htmlFor="help-definition">Definition</label>
            <textarea
              id="help-definition"
              rows={3}
              maxLength={250}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
            />
            <label htmlFor="help-sentence">Example sentence</label>
            <textarea
              id="help-sentence"
              rows={3}
              maxLength={250}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
            {word.sentence && (
              <p className="field-help">
                Your word list sentence will be used during practice.
              </p>
            )}
            <details>
              <summary>Find a meaning in the free dictionary</summary>
              <p className="field-help">
                This sends your word and IP address to dictionaryapi.dev, a
                general dictionary (not just for kids). Review choices before
                saving. Your photo and word list aren’t sent.
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I’m a grown-up and allow this lookup
              </label>
              <button
                type="button"
                className="button button-light"
                disabled={!consent || loading}
                onClick={() => void lookup()}
              >
                {loading ? "Looking up…" : "Look up this word"}
              </button>
              {loading && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => abort.current?.abort()}
                >
                  Cancel lookup
                </button>
              )}
              <div className="dictionary-choices">
                {choices.map((choice, i) => (
                  <article key={i}>
                    <small>{choice.partOfSpeech}</small>
                    <p>{choice.definition}</p>
                    {choice.sentence && <p>Example: {choice.sentence}</p>}
                    <button
                      type="button"
                      className="button button-light button-small"
                      onClick={() => {
                        setDefinition(choice.definition);
                        setSentence(word.sentence || choice.sentence);
                        setSource({
                          source: choice.source,
                          license: choice.license,
                          licenseUrl: choice.licenseUrl,
                        });
                      }}
                    >
                      Use meaning {i + 1}
                    </button>
                    <small>
                      <a
                        href={choice.source}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Wiktionary source
                      </a>{" "}
                      ·{" "}
                      <a
                        href={choice.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {choice.license}
                      </a>
                    </small>
                  </article>
                ))}
              </div>
            </details>
            {source.source && (
              <p className="field-help">
                From{" "}
                <a
                  href={source.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wiktionary
                </a>{" "}
                under{" "}
                <a
                  href={source.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.license}
                </a>
                . If you change the wording, keep this credit.
              </p>
            )}
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button button-light"
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={loading}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save word help"}
              </button>
            </div>
          </fieldset>
        </dialog>
      )}
    </section>
  );
}
