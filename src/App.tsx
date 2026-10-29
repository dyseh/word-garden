import { useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import Garden from "./Garden";
import PhotoImport from "./PhotoImport";
import WordHelp from "./WordHelp";
import "./settings.css";
import { alignSpelling } from "./spellingFeedback";
import { chooseVoice, childFriendlyVoices } from "./voices";
import { useNaturalVoice } from "./useNaturalVoice";
import {
  SETTINGS_KEY,
  defaultVoiceSettings,
  isValidVoiceSettings,
  type VoiceSettings,
} from "./voiceSettings";
import { PAUSE_MS, promptSegments } from "./speechPrompt";
import { answerGame, newGame, parseWords, retryWord, validGame, type Game } from "./game";
import { createAnswerSounds } from "./answerSounds";
import { practiceKey, readSession, writeSession, recoverPractice } from "./sessionRecovery";

type Feedback = {
  correct: boolean;
  earned: boolean;
  word: string;
  answer: string;
  wordIndex: number;
};
type Mode = "grow" | "learn";
function Sprout({ small = false }: { small?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={small ? 24 : 36}
      height={small ? 24 : 36}
      shapeRendering="crispEdges"
    >
      <path
        fill="#3b703a"
        d="M11 10h3v12h-3zM3 3h6v3h3v7H6v-3H3zM15 5h7v6h-3v3h-5V8h1z"
      />
      <path fill="#85ad53" d="M4 4h4v3h3v3H7V8H4zM16 7h5v3h-5z" />
    </svg>
  );
}

export default function App({
  sessionId,
  game,
  onGameChange,
  onCreateGarden,
  onBack,
  initialEditor = false,
  saved,
  storageError,
  naturalVoice,
}: {
  sessionId: string;
  game: Game;
  onGameChange: (game: Game) => void;
  onCreateGarden: (game: Game) => void;
  onBack: () => void;
  initialEditor?: boolean;
  saved: string;
  storageError: string;
  naturalVoice: ReturnType<typeof useNaturalVoice>;
}) {
  const setGame = onGameChange;
  const ready = true;
  const [recovered] = useState(() => recoverPractice(readSession(practiceKey(sessionId)), initialEditor));
  const [view, setView] = useState<"home" | "editor" | "play">(recovered.view);
  const [mode, setMode] = useState<Mode>(recovered.mode);
  const [answer, setAnswer] = useState("");
  const [answerSounds] = useState(createAnswerSounds);
  const [soundsEnabled, setSoundsEnabled] = useState(recovered.soundsEnabled);
  useEffect(() => () => answerSounds.dispose(), [answerSounds]);
  const [helped, setHelped] = useState(recovered.helpedWord === game.queue[0]);
  const [revealed, setRevealed] = useState(false);
  const [studying, setStudying] = useState(recovered.mode === "learn");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(recovered.title);
  const [list, setList] = useState(recovered.list);
  useEffect(() => {
    writeSession(practiceKey(sessionId), {
      view, mode, title, list, soundsEnabled,
      helpedWord: !feedback && helped ? game.queue[0] ?? null : null,
    });
  }, [sessionId, view, mode, title, list, soundsEnabled, helped, feedback, game.queue]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [voiceRate, setVoiceRate] = useState(0.9);
  const [speechEngine, setSpeechEngine] = useState<"device" | "kokoro">(
    "device",
  );
  const [remoteAllowed, setRemoteAllowed] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [heard, setHeard] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [autoPrepare, setAutoPrepare] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const savedSettings = useRef<VoiceSettings>(defaultVoiceSettings);
  const autoStarted = useRef(false);
  function applySettings(value: VoiceSettings) {
    setSpeechEngine(value.engine);
    setVoiceId(value.voiceId);
    setVoiceRate(value.rate);
    setRemoteAllowed(value.remoteAllowed);
    setAutoPrepare(value.autoPrepare);
  }
  function openSettings() {
    stopSpeech();
    applySettings(savedSettings.current);
    setSettingsMessage("");
    setPrivacy(true);
  }
  function cancelSettings() {
    if (settingsSaving) return;
    stopSpeech();
    applySettings(savedSettings.current);
    setPrivacy(false);
    setSettingsMessage("Changes cancelled.");
  }
  async function saveSettings() {
    stopSpeech();
    setSettingsSaving(true);
    const value: VoiceSettings = {
      version: 1,
      engine: speechEngine,
      voiceId,
      rate: voiceRate,
      remoteAllowed,
      autoPrepare,
    };
    try {
      await set(SETTINGS_KEY, value);
      savedSettings.current = value;
      setSettingsMessage("Voice settings saved.");
      setPrivacy(false);
      if (value.engine === "kokoro" && value.autoPrepare)
        void naturalVoice.load();
    } catch {
      setSettingsMessage(
        "Settings weren’t saved. Try again, or cancel to keep your old settings.",
      );
    } finally {
      setSettingsSaving(false);
    }
  }
  useEffect(() => {
    let alive = true;
    get(SETTINGS_KEY)
      .then((value) => {
        if (alive && isValidVoiceSettings(value)) {
          savedSettings.current = value;
          applySettings(value);
        }
      })
      .catch(() => {
        if (alive) setSettingsMessage("Voice settings could not be loaded.");
      })
      .finally(() => {
        if (alive) setSettingsReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (settingsReady && !autoStarted.current) {
      autoStarted.current = true;
      if (
        savedSettings.current.engine === "kokoro" &&
        savedSettings.current.autoPrepare
      )
        void naturalVoice.load();
    }
  }, [settingsReady]);

  const input = useRef<HTMLInputElement>(null);
  const speechGeneration = useRef(0);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const privacyDialog = useRef<HTMLDialogElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const practicePanel = useRef<HTMLElement>(null);
  const lastPeeked = useRef<number | null>(recovered.helpedWord);
  useEffect(() => {
    if (privacy) privacyDialog.current?.showModal();
  }, [privacy]);
  const complete = game.queue.length === 0;
  const word = game.words[game.queue[0]];
  const availableVoices = childFriendlyVoices(voices, remoteAllowed);
  const voice = chooseVoice(availableVoices, voiceId);
  const isPlaying = view === "play" && (!complete || !!feedback);
  const prefetchKey = JSON.stringify(
    game.queue.slice(0, 3).map((i) => promptSegments(game.words[i])),
  );
  useEffect(() => {
    if (
      ready &&
      speechEngine === "kokoro" &&
      naturalVoice.ready &&
      !privacy &&
      view !== "editor"
    )
      naturalVoice.prefetch(JSON.parse(prefetchKey));
  }, [prefetchKey, speechEngine, naturalVoice.status, privacy, view, ready]);
  let previewCount = 0;
  try {
    previewCount = parseWords(list).length;
  } catch {
    /* validation shown on submit */
  }
  useEffect(() => {
    if (feedback) continueButton.current?.focus({ preventScroll: true });
  }, [feedback]);
  useEffect(() => {
    if (isPlaying && window.matchMedia("(max-width: 760px)").matches) {
      practicePanel.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  }, [view, isPlaying]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const sync = () => setVoices(window.speechSynthesis.getVoices());
    sync();
    window.speechSynthesis.addEventListener("voiceschanged", sync);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", sync);
      window.speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    if (view === "play" && !studying && !feedback) input.current?.focus();
  }, [view, studying, feedback, heard, mode]);
  useEffect(
    () => () => {
      speechGeneration.current++;
      if (speechTimer.current) clearTimeout(speechTimer.current);
      naturalVoice.cancel();
    },
    [],
  );

  function stopSpeech() {
    answerSounds.stop();
    naturalVoice.cancel();
    speechGeneration.current++;
    if (speechTimer.current) clearTimeout(speechTimer.current);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }
  function sayWord(
    target = word,
    rate = voiceRate,
    preview = false,
    helperText?: string,
  ) {
    if (!target) return;
    stopSpeech();
    setSpeechError("");
    const generation = speechGeneration.current;
    const segments = helperText ? [helperText] : promptSegments(target);
    if (speechEngine === "kokoro") {
      setSpeaking(true);
      void naturalVoice
        .play(segments, () => {
          if (generation === speechGeneration.current && !preview)
            setHeard(true);
        })
        .then(() => {
          if (generation === speechGeneration.current) setSpeaking(false);
        })
        .catch((e) => {
          if (
            generation !== speechGeneration.current ||
            e?.message === "Cancelled"
          )
            return;
          setSpeaking(false);
          setSpeechError(
            "The natural voice didn’t play. Try again or pick Device voice in settings.",
          );
        });
      return;
    }
    if (!("speechSynthesis" in window) || !voice) {
      setSpeechError(
        "No voice is ready. Ask a grown-up for help, or try Look & remember.",
      );
      return;
    }
    setSpeaking(true);
    const speakPart = (index: number) => {
      if (generation !== speechGeneration.current) return;
      if (index >= segments.length) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(segments[index]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      utterance.onstart = () => {
        if (generation !== speechGeneration.current) return;
        if (speechTimer.current) clearTimeout(speechTimer.current);
        if (index === 0 && !preview) setHeard(true);
      };
      utterance.onend = () => {
        if (generation !== speechGeneration.current) return;
        if (speechTimer.current) clearTimeout(speechTimer.current);
        if (index + 1 === segments.length) setSpeaking(false);
        else
          speechTimer.current = setTimeout(
            () => speakPart(index + 1),
            PAUSE_MS,
          );
      };
      utterance.onerror = () => {
        if (generation !== speechGeneration.current) return;
        stopSpeech();
        setSpeechError(
          "The voice didn’t play. Try again or practice without sound.",
        );
      };
      speechTimer.current = setTimeout(() => {
        if (generation !== speechGeneration.current) return;
        stopSpeech();
        setSpeechError(
          "No sound? Try another voice or practice without sound.",
        );
      }, 6000);
      window.speechSynthesis.speak(utterance);
    };
    speakPart(0);
  }
  function resetPrompt(nextMode: Mode) {
    setAnswer("");
    setHelped(lastPeeked.current === game.queue[0]);
    setRevealed(false);
    setFeedback(null);
    setStudying(nextMode === "learn");
    setHeard(false);
    setError("");
    setSpeechError("");
  }
  function start(nextMode: Mode) {
    setMode(nextMode);
    resetPrompt(nextMode);
    setView("play");
    if (nextMode === "grow") sayWord();
    else stopSpeech();
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !word ||
      feedback ||
      !answer.trim() ||
      studying ||
      (mode === "grow" && !heard)
    )
      return;
    stopSpeech();
    const result = answerGame(game, answer, helped);
    if (soundsEnabled) void answerSounds.play(result.correct);
    setFeedback({
      wordIndex: game.queue[0],
      correct: result.correct,
      earned: result.earned,
      word: word.text,
      answer: answer.trim(),
    });
    lastPeeked.current = null;
    setGame(result.game);
  }
  function backToPracticeOptions() {
    stopSpeech();
    setView("home");
    setFeedback(null);
  }
  function next() {
    answerSounds.stop();
    resetPrompt(mode);
    if (!complete && mode === "grow") sayWord();
  }
  function tryAgain() {
    if (!feedback || feedback.correct) return;
    const missedWord = game.words[feedback.wordIndex];
    stopSpeech();
    setGame(retryWord(game, feedback.wordIndex));
    resetPrompt(mode);
    // The correction has been shown: keep the existing assisted-answer rule.
    lastPeeked.current = feedback.wordIndex;
    setHelped(true);
    setStudying(false);
    if (mode === "grow") sayWord(missedWord);
  }
  function edit() {
    stopSpeech();
    setError("");
    setTitle("");
    setList("");
    setView("editor");
  }
  function plant(e: React.FormEvent) {
    e.preventDefault();
    try {
      const words = parseWords(list);
      lastPeeked.current = null;
      onCreateGarden(newGame(words, title));
      setTitle("");
      setList("");
      setView("home");
      setError("");
      setFeedback(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your word list.");
    }
  }
  function backup() {
    const blob = new Blob([JSON.stringify(game, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-garden-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error("Choose a Word Garden backup under 100 KB.");
      const value: unknown = JSON.parse(await file.text());
      if (!validGame(value))
        throw new Error("This is not a valid Word Garden backup.");
      if (!window.confirm("Add this backup as a new garden for this child?"))
        return;
      stopSpeech();
      onCreateGarden(value);
      setView("home");
      setFeedback(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read backup.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div
      className={`app-shell ${isPlaying ? "is-playing" : ""} ${complete && !feedback ? "is-complete" : ""}`}
    >
      <a className="sr-only skip-link" href="#main">
        Skip to the garden
      </a>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            stopSpeech();
            setView("home");
            setFeedback(null);
            setError("");
          }}
          aria-label="Word Garden home"
        >
          <span className="brand-icon">
            <Sprout />
          </span>
          <span>
            word<span className="brand-green">garden</span>
            <small>SPELL WORDS. GROW A GARDEN.</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="local-tag">
            <span />
            No account needed
          </span>
          <button
            className="button button-small button-light"
            disabled={!settingsReady}
            onClick={openSettings}
          >
            For grown-ups
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {!privacy && settingsMessage && (
          <p className="settings-toast" role="status">
            {settingsMessage}
          </p>
        )}
        {!privacy && speechEngine === "kokoro" && (
          <div className="voice-readiness" role="status">
            {naturalVoice.status === "loading"
              ? naturalVoice.message
              : naturalVoice.ready
                ? naturalVoice.preparing
                  ? "Getting the next words ready…"
                  : `Voice ready · ${naturalVoice.preparedCount} recordings ready`
                : "Load the natural voice to hear words."}
            {!naturalVoice.ready && naturalVoice.status !== "loading" && (
              <button
                type="button"
                className="text-button"
                onClick={() => void naturalVoice.load()}
              >
                Load voice
              </button>
            )}
          </div>
        )}
        <div className="breadcrumb">
          <Sprout small />
          <span>Your spelling garden</span>
          <span className="edition">SPELLING PRACTICE</span>
        </div>
        {storageError && (
          <div className="notice" role="alert">
            {storageError} <button onClick={backup}>Export backup</button>
          </div>
        )}
        {error && view !== "editor" && (
          <div className="notice" role="alert">
            {error}
          </div>
        )}
        {!ready ? (
          <section className="loading">
            <Sprout />
            <h1>Opening the garden…</h1>
          </section>
        ) : view === "editor" ? (
          <section className="editor-layout">
            <div className="editor-intro">
              <span className="pixel-label">NEW GARDEN</span>
              <h1>
                Add your words.
                <br />
                Grow your garden.
              </h1>
              <p>Use your school list or choose your own words.</p>
              <Garden total={6} grown={3} />
            </div>
            <form className="panel editor-panel" onSubmit={plant}>
              <h2>Make a word list</h2>
              <label htmlFor="garden-name">Garden name</label>
              <input
                id="garden-name"
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Maya’s weekly words"
              />
              <PhotoImport
                onAdd={(words) =>
                  setList((current) =>
                    [current.trim(), ...words].filter(Boolean).join("\n"),
                  )
                }
              />
              <label htmlFor="word-list">Your spelling words</label>
              <p className="field-help" id="list-help">
                Add up to 100 words. Put each word on a new line, or use commas.
              </p>
              <textarea
                id="word-list"
                value={list}
                onChange={(e) => setList(e.target.value)}
                rows={8}
                maxLength={30000}
                aria-describedby="list-help"
                placeholder={
                  "sun\nflower\napple\nthere | Put the basket over there."
                }
              />
              <div className="word-preview" aria-live="polite">
                {previewCount
                  ? `${previewCount} ${previewCount === 1 ? "word" : "words"} ready to plant`
                  : "Type words or add a photo above."}
              </div>
              <details className="context-help">
                <summary>Words that sound alike?</summary>
                <p>
                  Add a sentence after a | character, like{" "}
                  <strong>pear | I ate a ripe pear.</strong> The voice reads it
                  aloud without showing the spelling.
                </p>
              </details>
              <p className="field-help">
                Check the spellings before you plant.
              </p>
              {error && (
                <p className="notice" role="alert">
                  {error}
                </p>
              )}
              <p className="field-help">
                This adds a new garden. Your other gardens stay saved.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => {
                    if (initialEditor) onBack();
                    else setView("home");
                    setError("");
                  }}
                >
                  Cancel
                </button>
                <button className="button button-primary" type="submit">
                  Plant my garden <span aria-hidden="true">✦</span>
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <section className="page-heading">
              <div>
                <span className="pixel-label">
                  {complete ? "ROUND DONE" : "YOUR SPELLING GARDEN"}
                </span>
                <h1>
                  {complete
                    ? "Your garden is full!"
                    : "Spell words. Grow a garden."}
                </h1>
                <p>
                  {complete
                    ? "You spelled every word in this round."
                    : "Practice your words to grow fruit and vegetables."}
                </p>
              </div>
              <button className="button button-light" onClick={edit}>
                <span aria-hidden="true">＋</span> New word list
              </button>
            </section>
            {isPlaying && (
              <div className="session-bar">
                <span>
                  <Sprout small />{" "}
                  <strong>
                    {game.queue.length}{" "}
                    {game.queue.length === 1 ? "word" : "words"} left to grow
                  </strong>
                </span>
                <button
                  className="button button-light button-small"
                  onClick={backToPracticeOptions}
                >
                  Pause practice
                </button>
              </div>
            )}
            <div className="play-layout">
              <section className="garden-panel" aria-label="Your garden">
                <div className="garden-topline">
                  <div>
                    <span className="pixel-label">
                      YOUR GARDEN · ROUND {game.round}
                    </span>
                    <h2>{game.title}</h2>
                  </div>
                  <span
                    className="weather-tag"
                    aria-label="Garden weather: sunny"
                  >
                    <span aria-hidden="true">☀</span> Sunny
                  </span>
                </div>
                <Garden total={game.words.length} grown={game.grown.length} />
                <div className="garden-bottom">
                  <div className="growth-label">
                    <Sprout small />
                    <strong>
                      {game.grown.length} of {game.words.length} words grown
                    </strong>
                    <span>
                      {Math.round(
                        (game.grown.length / game.words.length) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Words grown"
                    aria-valuenow={game.grown.length}
                    aria-valuemin={0}
                    aria-valuemax={game.words.length}
                  >
                    <div
                      style={{
                        width: `${(game.grown.length / game.words.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p>
                    {complete
                      ? "All your plants have grown."
                      : "Spell each word to grow a plant."}
                  </p>
                </div>
              </section>
              <section
                ref={practicePanel}
                className="panel practice-panel"
                aria-label="Spelling practice"
              >
                {isPlaying && (
                  <button
                    type="button"
                    className="button button-light button-full"
                    onClick={backToPracticeOptions}
                  >
                    <span aria-hidden="true">←</span> Back to practice options
                  </button>
                )}
                <button
                  type="button"
                  className="text-button"
                  aria-pressed={soundsEnabled}
                  onClick={() => {
                    answerSounds.stop();
                    setSoundsEnabled(!soundsEnabled);
                  }}
                >
                  Answer sounds: {soundsEnabled ? "on" : "off"}
                </button>
                {feedback ? (
                  <div className="feedback" aria-live="polite">
                    <span className="pixel-label">
                      {feedback.correct ? "CORRECT" : "TRY AGAIN"}
                    </span>
                    <div
                      className={`result-icon ${feedback.earned ? "success" : ""}`}
                      aria-hidden="true"
                    >
                      {feedback.earned ? "✦" : "↻"}
                    </div>
                    <h2>
                      {feedback.earned
                        ? "That’s right!"
                        : feedback.correct
                          ? "You got it with help."
                          : "Let’s check the spelling."}
                    </h2>
                    <p>
                      {feedback.earned
                        ? "Your plant grew!"
                        : feedback.correct
                          ? "You saw the spelling. Try this word again without looking."
                          : "Check these letters, then try again. You can also move to the next word."}
                    </p>
                    {!feedback.correct && (
                      <p className="previous-answer">
                        You typed: <span>{feedback.answer}</span>
                      </p>
                    )}
                    {feedback.correct ? (
                      <div className="correct-word">{feedback.word}</div>
                    ) : (
                      <>
                        <div
                          className="letter-comparison"
                          aria-label={`Correct spelling: ${feedback.word}`}
                        >
                          {alignSpelling(
                            feedback.word,
                            feedback.answer,
                            true,
                          ).map((part, i) => (
                            <span
                              className="letter-tile"
                              data-kind={part.kind}
                              key={i}
                              aria-hidden="true"
                            >
                              {part.expected || part.actual}
                              <small>
                                {part.kind === "extra"
                                  ? "−"
                                  : part.kind === "missing"
                                    ? "+"
                                    : part.kind === "replace"
                                      ? "↺"
                                      : "✓"}
                              </small>
                            </span>
                          ))}
                        </div>
                        <ul className="correction-notes">
                          {alignSpelling(feedback.word, feedback.answer).map(
                            (part, i) => (
                              <li key={i}>
                                {part.kind === "missing"
                                  ? `Add “${part.expected}”.`
                                  : part.kind === "extra"
                                    ? `Leave out “${part.actual}”.`
                                    : `Use “${part.expected}” instead of “${part.actual}”.`}
                              </li>
                            ),
                          )}
                        </ul>
                      </>
                    )}
                    {!feedback.correct && (
                      <button
                        className="button button-primary button-full"
                        ref={continueButton}
                        onClick={tryAgain}
                      >
                        Try again <span aria-hidden="true">↻</span>
                      </button>
                    )}
                    <button
                      className={`button ${feedback.correct ? "button-primary" : "button-light"} button-full`}
                      ref={feedback.correct ? continueButton : undefined}
                      onClick={next}
                    >
                      {complete ? "See my harvest" : "Next word"}{" "}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                ) : complete ? (
                  <div className="complete-state">
                    <span className="pixel-label">ROUND DONE</span>
                    <div className="harvest-icon">
                      <Sprout />
                    </div>
                    <h2>You did it!</h2>
                    <p>
                      All {game.words.length} words grown. Come back another day
                      to see what you remember.
                    </p>
                    <div className="completion-stat">
                      <strong>{game.words.length}</strong>
                      <span>words practiced</span>
                    </div>
                    <button
                      className="button button-primary button-full"
                      onClick={() => {
                        setGame(
                          newGame(game.words, game.title, game.round + 1),
                        );
                        setView("home");
                      }}
                    >
                      Practice again
                    </button>
                    <button className="text-button" onClick={edit}>
                      Use a new word list
                    </button>
                    <p className="field-help">
                      You finished this round. Practicing on other days helps
                      you remember.
                    </p>
                  </div>
                ) : view === "home" ? (
                  <div className="start-state">
                    <span className="pixel-label">LET’S PRACTICE</span>
                    <div className="seed-packet">
                      <Sprout />
                      <span>
                        WORD
                        <br />
                        SEEDS
                      </span>
                      <small>{game.words.length} words to practice</small>
                    </div>
                    <h2>Ready to spell?</h2>
                    <p>
                      Listen, then type the word.
                      <br />
                      Each correct answer grows a plant.
                    </p>
                    <button
                      className="button button-primary button-full"
                      onClick={() => start("grow")}
                    >
                      {game.grown.length ? "Keep practicing" : "Start spelling"}{" "}
                      <span aria-hidden="true">→</span>
                    </button>
                    <button
                      className="button button-light button-full"
                      onClick={() => start("learn")}
                    >
                      Look & remember
                    </button>
                    <span className="quiet-note">
                      Take your time. There’s no timer.
                    </span>
                  </div>
                ) : (
                  <div className="active-practice">
                    <div className="practice-top">
                      <span className="pixel-label">
                        {mode === "grow" ? "LISTEN & SPELL" : "LOOK & REMEMBER"}
                      </span>
                    </div>
                    <h2>
                      {mode === "learn" && studying
                        ? "Look at the word."
                        : "Type the word."}
                    </h2>
                    <p>
                      {mode === "grow"
                        ? "Listen, then type what you hear."
                        : studying
                          ? "Look at each letter. Then hide the word and try."
                          : "Type the word you just saw."}
                    </p>
                    {mode === "grow" && (
                      <button
                        className={`listen-button ${speaking ? "is-speaking" : ""}`}
                        disabled={naturalVoice.status === "generating"}
                        onClick={() => sayWord()}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="30"
                          height="30"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 9v6h4l5 4V5L7 9H3zM16 8q5 4 0 8M19 4q9 8 0 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                        <span>
                          {naturalVoice.status === "generating"
                            ? "Getting the word ready…"
                            : speaking
                              ? "Speaking…"
                              : "Hear again"}
                        </span>
                      </button>
                    )}
                    {mode === "grow" && (
                      <div className="practice-shortcuts">
                        {speechEngine === "device" && (
                          <button
                            type="button"
                            className="text-button"
                            disabled={naturalVoice.status === "generating"}
                            onClick={() => sayWord(word, 0.7)}
                          >
                            Hear it slowly
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            openSettings();
                          }}
                        >
                          Voice settings
                        </button>
                      </div>
                    )}
                    {mode === "grow" && (
                      <WordHelp
                        key={word.text}
                        word={word}
                        disabled={naturalVoice.status === "generating"}
                        onStop={stopSpeech}
                        onSpeak={(text) => sayWord(word, voiceRate, true, text)}
                        onReveal={() => {
                          lastPeeked.current = game.queue[0];
                          setHelped(true);
                        }}
                      />
                    )}
                    {mode === "learn" && studying ? (
                      <>
                        <div className="study-word">{word.text}</div>
                        <button
                          className="button button-primary button-full"
                          onClick={() => setStudying(false)}
                        >
                          Hide word & try
                        </button>
                      </>
                    ) : (
                      <form onSubmit={submit}>
                        <label htmlFor="spelling-answer">Your spelling</label>
                        <input
                          ref={input}
                          id="spelling-answer"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          maxLength={60}
                          placeholder="Type the word…"
                          disabled={mode === "grow" && !heard}
                        />
                        <button
                          className="button button-primary button-full"
                          disabled={
                            !answer.trim() || (mode === "grow" && !heard)
                          }
                          type="submit"
                        >
                          Check spelling <span aria-hidden="true">→</span>
                        </button>
                        <button
                          className="text-button peek-button"
                          type="button"
                          onClick={() => {
                            lastPeeked.current = game.queue[0];
                            setHelped(true);
                            setRevealed(!revealed);
                          }}
                        >
                          {revealed ? "Hide the word" : "Need a peek?"}
                        </button>
                        {revealed && (
                          <div className="peek-word">
                            {word.text}
                            <small>You’ll try again without looking.</small>
                          </div>
                        )}
                      </form>
                    )}
                    {mode === "grow" && (
                      <>
                        {speechError && (
                          <p className="notice" role="alert">
                            {speechError}
                          </p>
                        )}
                        <button
                          className="text-button"
                          onClick={() => start("learn")}
                        >
                          Practice without sound
                        </button>
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
            <section className="how-it-grows" aria-label="How it works">
              <div>
                <span className="step-number">1</span>
                <div>
                  <h3>Plant your words</h3>
                  <p>Type your words or use a photo.</p>
                </div>
              </div>
              <div>
                <span className="step-number">2</span>
                <div>
                  <h3>Try each word</h3>
                  <p>Missed a word? You can try again.</p>
                </div>
              </div>
              <div>
                <span className="step-number">3</span>
                <div>
                  <h3>Grow your garden</h3>
                  <p>Spell all the words to finish.</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <footer>
        <span>
          <Sprout small />A little practice each day.
        </span>
        <div>
          <span className="save-status" role="status">
            {saved}
          </span>
          <button className="text-button" onClick={backup} disabled={!ready}>
            Export backup
          </button>
        </div>
      </footer>
      {privacy && (
        <dialog
          ref={privacyDialog}
          className="privacy-dialog"
          aria-labelledby="privacy-title"
          onCancel={(e) => {
            e.preventDefault();
            cancelSettings();
          }}
        >
          <h2 id="privacy-title">Grown-up corner</h2>
          <p className="field-help">
            Save changes to keep your settings. Cancel keeps your old settings.
            Trying a voice or downloading it happens right away. Cancel won’t
            delete downloaded files.
          </p>
          {settingsMessage && <p role="status">{settingsMessage}</p>}
          <fieldset disabled={settingsSaving} className="settings-fieldset">
            <details>
              <summary>Restore a garden backup</summary>
              <label htmlFor="restore-garden">
                Choose a Word Garden backup
              </label>
              <input
                id="restore-garden"
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void restore(e.target.files?.[0])}
              />
            </details>
            <div className="voice-settings">
              <label htmlFor="speech-engine">Voice type</label>
              <select
                id="speech-engine"
                value={speechEngine}
                onChange={(e) => {
                  stopSpeech();
                  setSpeechEngine(e.target.value as "device" | "kokoro");
                  setHeard(false);
                  setSpeechError("");
                }}
              >
                <option value="device">Device voice · no extra download</option>
                <option value="kokoro">Natural voice · Kokoro</option>
              </select>
              <p className="field-help">
                The voice says the word, pauses, reads your example sentence,
                then pauses and repeats the word. Each pause is 0.9 seconds.
                Without a sentence, it says the word twice.
              </p>
              {speechEngine === "kokoro" ? (
                <section
                  className="natural-voice-settings"
                  aria-label="Natural voice setup"
                >
                  <strong>Kokoro · Heart voice · US English</strong>
                  <p className="field-help">
                    This voice runs on your device. First use downloads about 92
                    MB plus extra voice files from Hugging Face and other file
                    hosts. Your practice words stay on this device when making
                    speech.
                  </p>
                  <p className="field-help">
                    Saved voice files are reused after a refresh, but loading
                    still takes a moment. If your browser removes the files,
                    they’ll download again. Device voice needs no model
                    download.
                  </p>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={autoPrepare}
                      onChange={(e) => setAutoPrepare(e.target.checked)}
                    />
                    Load this voice when I open the app
                  </label>
                  <p className="field-help">
                    Reuses saved voice files and downloads any that are missing.
                    Gets up to three upcoming words ready on this device.
                  </p>
                  <p role="status">
                    {naturalVoice.message ||
                      (naturalVoice.ready
                        ? "Voice ready."
                        : "Voice not loaded yet.")}
                  </p>
                  {naturalVoice.status === "loading" ? (
                    <>
                      <progress aria-label="Preparing natural voice" />
                      <button
                        type="button"
                        className="button button-light button-full"
                        onClick={() => naturalVoice.cancelDownload()}
                      >
                        Cancel download
                      </button>
                    </>
                  ) : !naturalVoice.ready ? (
                    <button
                      type="button"
                      className="button button-primary button-full"
                      onClick={() => {
                        stopSpeech();
                        void naturalVoice.load();
                      }}
                    >
                      Load natural voice
                    </button>
                  ) : null}
                  {(naturalVoice.status === "generating" ||
                    naturalVoice.status === "playing") && (
                    <button
                      type="button"
                      className="button button-light button-full"
                      onClick={stopSpeech}
                    >
                      Stop voice
                    </button>
                  )}
                </section>
              ) : (
                <>
                  <label htmlFor="voice-select">Reading voice</label>
                  <select
                    id="voice-select"
                    value={voice?.voiceURI ?? ""}
                    onChange={(e) => {
                      stopSpeech();
                      setVoiceId(e.target.value);
                      setHeard(false);
                    }}
                  >
                    {!availableVoices.length && (
                      <option value="">No on-device English voice found</option>
                    )}
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                        {v.localService ? " · on device" : " · online"}
                      </option>
                    ))}
                  </select>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={remoteAllowed}
                      onChange={(e) => {
                        stopSpeech();
                        setRemoteAllowed(e.target.checked);
                        setHeard(false);
                      }}
                    />
                    Allow online voices (grown-up choice)
                  </label>
                  <p className="field-help">
                    Online voices may send words and sentences to your browser’s
                    speech provider.
                  </p>
                </>
              )}
              {speechEngine === "device" ? (
                <>
                  {" "}
                  <label htmlFor="voice-rate">Reading speed</label>
                  <select
                    id="voice-rate"
                    value={voiceRate}
                    onChange={(e) => {
                      stopSpeech();
                      setVoiceRate(Number(e.target.value));
                    }}
                  >
                    <option value={0.7}>Slower</option>
                    <option value={0.9}>Steady</option>
                    <option value={1}>Normal</option>
                  </select>
                </>
              ) : (
                <p className="field-help">
                  Kokoro uses normal speed to keep words clear. It still pauses
                  between parts.
                </p>
              )}
              <button
                type="button"
                className="button button-light button-full"
                disabled={speechEngine === "kokoro" && !naturalVoice.ready}
                onClick={() =>
                  sayWord(
                    {
                      text: "sunshine",
                      sentence: "The sunshine helps our garden grow.",
                    },
                    voiceRate,
                    true,
                  )
                }
              >
                Try this voice
              </button>
              {speechError && (
                <p className="notice" role="alert">
                  {speechError}
                </p>
              )}
            </div>

            <p>
              This app saves each child’s gardens in this browser. It has no
              accounts, ads or tracking. Photos aren’t uploaded.
            </p>
            <p>
              A grown-up can allow a dictionary lookup. It sends that word to
              dictionaryapi.dev. Saved definitions and sentences stay on this
              device, but aren’t included in garden backups. Clearing browser
              data can erase your work. Export a backup to keep your garden or
              move it to another device.
            </p>
            <p>
              Device voice uses your browser’s English voices. Kokoro downloads
              voice files and makes speech on your device. Online voices need
              your permission and may send practice text to their provider.
              Younger children may need help reading the instructions.
            </p>
            <p>
              In Look & remember, children see a word before spelling it. In
              Listen & spell, they hear it. A full garden means they finished a
              round, not that they’ll remember every word later.
            </p>
            <p>
              This is a test version. It doesn’t yet support device sync, review
              reminders or offline installation. It hasn’t been released
              publicly.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="button button-light"
                onClick={cancelSettings}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => void saveSettings()}
              >
                {settingsSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </fieldset>
        </dialog>
      )}
    </div>
  );
}
