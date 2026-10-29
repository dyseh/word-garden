import { useEffect, useRef, useState } from "react";
import {
  MAX_OCR_CANDIDATES,
  type OcrCandidate,
} from "./ocrWords";
import { parseWords } from "./game";
import "./photoImport.css";
type Crop = { left: number; top: number; right: number; bottom: number };
const whole: Crop = { left: 0, top: 0, right: 100, bottom: 100 };
export default function PhotoImport({
  onAdd,
}: {
  onAdd: (words: string[]) => void;
}) {
  const [image, setImage] = useState<HTMLCanvasElement | null>(null),
    [rotation, setRotation] = useState(0),
    [crop, setCrop] = useState<Crop>(whole);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [progress, setProgress] = useState(0),
    [status, setStatus] = useState("");
  const [error, setError] = useState(""),
    [candidates, setCandidates] = useState<OcrCandidate[] | null>(null),
    [raw, setRaw] = useState(""),
    [confidence, setConfidence] = useState(0),
    [confirmed, setConfirmed] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    worker = useRef<Worker | null>(null),
    generation = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReject = useRef<((error: Error) => void) | null>(null);
  const imageUrl = useRef<string | null>(null);
  const rotated = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  function stop() {
    generation.current++;
    pendingReject.current?.(new Error("Cancelled"));
    pendingReject.current = null;
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    imageUrl.current = null;
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    setBusy(false);
    setLoading(false);
    setStatus("Stopped. Your photo and typed words are unchanged.");
  }
  function clear() {
    stop();
    setImage(null);
    rotated.current = null;
    setCandidates(null);
    setRaw("");
    setError("");
    setStatus("");
    if (fileInput.current) fileInput.current.value = "";
  }
  useEffect(
    () => () => {
      generation.current++;
      pendingReject.current?.(new Error("Cancelled"));
      pendingReject.current = null;
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      imageUrl.current = null;
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!image || !preview.current) return;
    const canvas = preview.current;
    const swap = rotation % 180 !== 0;
    canvas.width = swap ? image.height : image.width;
    canvas.height = swap ? image.width : image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rotated.current = canvas;
  }, [image, rotation, candidates]);
  async function loadFile(file?: File) {
    if (!file) return;
    stop();
    const id = generation.current;
    setError("");
    setCandidates(null);
    setConfirmed(false);
    setLoading(true);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error(
          "Choose a JPG, PNG or WebP photo. Export HEIC or PDF files as an image first.",
        );
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Choose a photo smaller than 20 MB.");
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      if (id !== generation.current) {
        bitmap.close();
        return;
      }
      try {
        if (bitmap.width * bitmap.height > 40000000)
          throw new Error(
            "This photo is too large. Resize it below 40 megapixels.",
          );
        const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        setImage(canvas);
        setRotation(0);
        setCrop(whole);
        setStatus("Drag around the word list, or adjust the crop below.");
      } finally {
        bitmap.close();
      }
    } catch (e) {
      if (id === generation.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not open that photo. Try a JPG or PNG.",
        );
    } finally {
      if (id === generation.current) setLoading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function recognize() {
    if (!rotated.current) return;
    stop();
    const id = generation.current;
    setError("");
    setBusy(true);
    setProgress(0);
    setStatus("Preparing local OCR…");
    setConfirmed(false);
    try {
      const source = rotated.current;
      const left = Math.round((source.width * crop.left) / 100),
        top = Math.round((source.height * crop.top) / 100);
      const width = Math.round((source.width * (crop.right - crop.left)) / 100),
        height = Math.round((source.height * (crop.bottom - crop.top)) / 100);
      if (width < 20 || height < 20)
        throw new Error("Select a larger area around the words.");
      const area = document.createElement("canvas");
      area.width = width;
      area.height = height;
      area
        .getContext("2d")!
        .drawImage(source, left, top, width, height, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        area.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Could not prepare image.")),
          "image/png",
        ),
      );
      if (id !== generation.current) return;
      const url = URL.createObjectURL(blob);
      imageUrl.current = url;
      const w = new Worker(new URL("./ocr.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      const result = await new Promise<{ text: string; confidence: number; candidates: OcrCandidate[] }>(
        (resolve, reject) => {
          pendingReject.current = reject;
          timer.current = setTimeout(
            () =>
              reject(
                new Error(
                  "Recognition took too long. Try cropping more tightly or using a clearer photo.",
                ),
              ),
            120000,
          );
          w.onerror = () =>
            reject(
              new Error(
                "OCR could not start. Check the connection for its first download and try again.",
              ),
            );
          w.onmessage = (event: MessageEvent) => {
            if (id !== generation.current) return;
            const m = event.data;
            if (m.type === "progress") {
              setStatus(m.status);
              setProgress(m.progress);
            } else if (m.type === "result") resolve(m);
            else if (m.type === "error") reject(new Error(m.message));
          };
          w.postMessage({ url });
        },
      ).finally(() => {
        URL.revokeObjectURL(url);
        if (imageUrl.current === url) imageUrl.current = null;
        if (id === generation.current) pendingReject.current = null;
      });
      if (id !== generation.current) return;
      setRaw(result.text);
      setConfidence(result.confidence);
      setCandidates(result.candidates);
      setStatus("Unrecognized words removed. Review the remaining spellings before adding them.");
    } catch (e) {
      if (id === generation.current)
        setError(
          e instanceof Error
            ? e.message
            : "Recognition failed. Try again or type your words.",
        );
    } finally {
      if (id === generation.current) {
        worker.current?.terminate();
        worker.current = null;
        if (timer.current) clearTimeout(timer.current);
        setBusy(false);
      }
    }
  }
  function update(index: number, change: Partial<OcrCandidate>) {
    setCandidates(
      (rows) =>
        rows?.map((r, i) => (i === index ? { ...r, ...change } : r)) ?? null,
    );
    setConfirmed(false);
  }
  function add() {
    try {
      const selected =
        candidates?.filter((c) => c.selected).map((c) => c.text) ?? [];
      const parsed = parseWords(selected.join("\n"));
      onAdd(parsed.map((w) => w.text));
      clear();
      setStatus(`${parsed.length} words added to your list.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the selected words.");
    }
  }
  function point(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }
  const selected = candidates?.filter((c) => c.selected).length ?? 0;
  return (
    <section className="photo-import" aria-labelledby="photo-heading">
      <div className="photo-title">
        <div>
          <span className="pixel-label">Get words from a photo</span>
          <h3 id="photo-heading">Add a photo</h3>
        </div>
        <span className="photo-local">No upload</span>
      </div>
      <p className="field-help">
        Works best with printed English lists. Crop out names and instructions.
        Your photo stays on this device. It isn’t uploaded or saved.
      </p>
      <input
        ref={fileInput}
        id="word-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => void loadFile(e.target.files?.[0])}
      />
      {!image && !loading && (
        <button
          type="button"
          className="button button-light button-full"
          onClick={() => fileInput.current?.click()}
        >
          Choose a photo
        </button>
      )}
      {loading && <p role="status">Opening photo…</p>}
      {image && (
        <>
          <div
            className="photo-preview"
            onPointerDown={(e) => {
              if (busy || candidates) return;
              pointer.current = point(e);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!pointer.current) return;
              const p = point(e),
                a = pointer.current;
              setCrop({
                left: Math.min(a.x, p.x),
                right: Math.max(a.x, p.x),
                top: Math.min(a.y, p.y),
                bottom: Math.max(a.y, p.y),
              });
            }}
            onPointerUp={() => {
              pointer.current = null;
            }}
            onPointerCancel={() => {
              pointer.current = null;
            }}
          >
            <canvas
              ref={preview}
              aria-label="Photo preview. Drag around the words, or use the crop sliders below."
            />
            <div
              className="crop-overlay"
              style={{
                left: `${crop.left}%`,
                top: `${crop.top}%`,
                width: `${crop.right - crop.left}%`,
                height: `${crop.bottom - crop.top}%`,
              }}
            />
          </div>
          {!candidates && (
            <>
              <div className="photo-actions">
                <button
                  type="button"
                  className="button button-light button-small"
                  disabled={busy}
                  onClick={() => {
                    setRotation((r) => (r + 90) % 360);
                    setCrop(whole);
                  }}
                >
                  Rotate 90°
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => setCrop(whole)}
                >
                  Use whole photo
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  Change photo
                </button>
              </div>
              <details className="crop-controls">
                <summary>Adjust crop with sliders</summary>
                {(["left", "top", "right", "bottom"] as const).map((edge) => (
                  <label key={edge}>
                    {edge[0].toUpperCase() + edge.slice(1)} edge{" "}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      disabled={busy}
                      value={crop[edge]}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setCrop((c) => ({
                          ...c,
                          [edge]:
                            edge === "left"
                              ? Math.min(value, c.right - 1)
                              : edge === "top"
                                ? Math.min(value, c.bottom - 1)
                                : edge === "right"
                                  ? Math.max(value, c.left + 1)
                                  : Math.max(value, c.top + 1),
                        }));
                      }}
                    />
                  </label>
                ))}
              </details>
              {busy ? (
                <>
                  <progress
                    aria-label="Photo recognition progress"
                    max={1}
                    value={progress}
                  />
                  <button
                    type="button"
                    className="button button-light button-full"
                    onClick={stop}
                  >
                    Stop reading photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button button-primary button-full"
                  onClick={() => void recognize()}
                >
                  Find my words
                </button>
              )}
            </>
          )}
        </>
      )}
      <p className="field-help" role="status">
        {status}
      </p>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {candidates && (
        <div className="ocr-review">
          <h3>Check your words</h3>
          <p className="field-help">
            Only words recognized by the English dictionary are shown. Check for
            wrong words and uncheck headings. No spellings were automatically
            corrected. Names and unusual words may be missing; type those into
            your word list yourself.
          </p>
          {confidence < 70 && (
            <p className="notice">
              This photo was blurry or unclear. Check every word carefully, or
              try a clearer photo.
            </p>
          )}
          {candidates.length === MAX_OCR_CANDIDATES && (
            <p className="notice">
              Only the first {MAX_OCR_CANDIDATES} possible words are shown. Crop
              to a shorter list.
            </p>
          )}
          {!candidates.length && (
            <p>No dictionary words found. Try a clearer photo, crop more tightly, or type your words into the list.</p>
          )}
          <div className="ocr-candidates">
            {candidates.map((candidate, i) => (
              <div
                className={`ocr-row ${candidate.needsReview ? "needs-review" : ""}`}
                key={i}
              >
                <input
                  type="checkbox"
                  aria-label={`Include word ${i + 1}`}
                  checked={candidate.selected}
                  onChange={(e) => update(i, { selected: e.target.checked })}
                />
                <input
                  aria-label={`Detected word ${i + 1}`}
                  value={candidate.text}
                  maxLength={60}
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => update(i, { text: e.target.value })}
                />
                {candidate.needsReview && (
                  <span title="May be a heading or number, or may have been read wrong">
                    Check
                  </span>
                )}
              </div>
            ))}
          </div>
          <details>
            <summary>Show original detected text</summary>
            <pre>{raw}</pre>
          </details>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I checked these spellings
          </label>
          <button
            type="button"
            disabled={!confirmed || !selected || selected > 100}
            className="button button-primary button-full"
            onClick={add}
          >
            Add {selected} words to my list
          </button>
          {selected > 100 && <p className="notice">Select up to 100 words.</p>}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setCandidates(null);
              setRaw("");
              setError("");
              setConfirmed(false);
            }}
          >
            Adjust photo and try again
          </button>
        </div>
      )}
      {(image || loading) && (
        <button type="button" className="text-button" onClick={clear}>
          Remove photo
        </button>
      )}
    </section>
  );
}
