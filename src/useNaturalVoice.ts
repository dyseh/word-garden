import { useEffect, useRef, useState } from "react";
type Status = "idle" | "loading" | "ready" | "generating" | "playing" | "error";
type Reply = {
  id: number;
  type: "ready" | "progress" | "audio" | "error";
  message?: string;
  samples?: Float32Array;
  rate?: number;
};
export function useNaturalVoice() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [preparedCount, setPreparedCount] = useState(0);
  const worker = useRef<Worker | null>(null);
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const pending = useRef<{
    id: number;
    resolve: (r: Reply) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const ids = useRef(0),
    epoch = useRef(0),
    playback = useRef(0);
  const loaded = useRef(false),
    mounted = useRef(true);
  const playReject = useRef<((e: Error) => void) | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const loading = useRef<Promise<void> | null>(null);
  const cache = useRef(new Map<string, Reply>());
  const flights = useRef(new Map<string, Promise<Reply>>());
  const upcoming = useRef<string[][]>([]);
  const pumping = useRef(false);
  const foreground = useRef(false);
  function cancel() {
    playback.current++;
    source.current?.stop();
    source.current = null;
    playReject.current?.(new Error("Cancelled"));
    playReject.current = null;
    foreground.current = false;
    upcoming.current = [];
    setStatus(loaded.current ? "ready" : loading.current ? "loading" : "idle");
    if (loaded.current) setMessage("");
  }
  function resetWorker() {
    epoch.current++;
    worker.current?.terminate();
    worker.current = null;
    loaded.current = false;
    cache.current.clear();
    flights.current.clear();
    setPreparedCount(0);
    if (pending.current) {
      clearTimeout(pending.current.timer);
      pending.current.reject(new Error("Cancelled"));
      pending.current = null;
    }
    chain.current = Promise.resolve();
  }
  function cancelDownload() {
    cancel();
    resetWorker();
    loading.current = null;
    setStatus("idle");
    setMessage("Stopped. Downloaded files can be reused.");
  }
  function rawRequest(
    type: "load" | "generate",
    payload: Record<string, unknown> = {},
  ): Promise<Reply> {
    if (!worker.current) {
      worker.current = new Worker(
        new URL("./kokoro.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current.onmessage = (e: MessageEvent<Reply>) => {
        const p = pending.current;
        if (!p || e.data.id !== p.id) return;
        if (e.data.type === "progress") {
          if (mounted.current) setMessage(e.data.message ?? "Preparing…");
          return;
        }
        clearTimeout(p.timer);
        pending.current = null;
        e.data.type === "error"
          ? p.reject(new Error(e.data.message ?? "Voice failed."))
          : p.resolve(e.data);
      };
      worker.current.onerror = () => {
        const p = pending.current;
        if (p) {
          clearTimeout(p.timer);
          pending.current = null;
          p.reject(new Error("The voice could not run on this device."));
        }
        resetWorker();
      };
    }
    return new Promise((resolve, reject) => {
      const id = ++ids.current;
      const timer = setTimeout(
        () => {
          if (pending.current?.id !== id) return;
          pending.current = null;
          reject(
            new Error(
              "The voice took too long to load. Try again or use Device voice.",
            ),
          );
          resetWorker();
        },
        type === "load" ? 300000 : 90000,
      );
      pending.current = { id, resolve, reject, timer };
      worker.current!.postMessage({ id, type, ...payload });
    });
  }
  function request(
    type: "load" | "generate",
    payload: Record<string, unknown> = {},
  ) {
    const version = epoch.current;
    const task = chain.current
      .catch(() => {})
      .then(() => {
        if (version !== epoch.current) throw new Error("Cancelled");
        return rawRequest(type, payload);
      });
    chain.current = task;
    return task;
  }
  function load(): Promise<void> {
    if (loaded.current) return Promise.resolve();
    if (loading.current) return loading.current;
    setStatus("loading");
    setMessage("Loading voice files. Missing files will download first…");
    const version = epoch.current;
    const task = request("load")
      .then(() => {
        if (version !== epoch.current || !mounted.current) return;
        loaded.current = true;
        setStatus("ready");
        setMessage("Voice ready. Saved files will be reused when available.");
      })
      .catch((e) => {
        if (version !== epoch.current || !mounted.current) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Could not prepare voice.");
      })
      .finally(() => {
        if (loading.current === task) loading.current = null;
      });
    loading.current = task;
    return task;
  }
  function audio(segments: string[]): Promise<Reply> {
    const key = JSON.stringify(segments);
    const cached = cache.current.get(key);
    if (cached) return Promise.resolve(cached);
    const running = flights.current.get(key);
    if (running) return running;
    const version = epoch.current;
    const task = request("generate", { segments })
      .then((result) => {
        if (version !== epoch.current) throw new Error("Cancelled");
        if (!result.samples || !result.rate)
          throw new Error("Voice returned no audio.");
        if (cache.current.size >= 6)
          cache.current.delete(cache.current.keys().next().value!);
        cache.current.set(key, result);
        if (mounted.current) setPreparedCount(cache.current.size);
        return result;
      })
      .finally(() => {
        if (flights.current.get(key) === task) flights.current.delete(key);
      });
    flights.current.set(key, task);
    return task;
  }
  async function pump() {
    if (pumping.current || !loaded.current || foreground.current) return;
    pumping.current = true;
    setPreparing(true);
    try {
      while (upcoming.current.length && loaded.current && !foreground.current) {
        const segments = upcoming.current.shift()!;
        await audio(segments);
      }
    } catch {
      /* Foreground playback will offer retry if preparation fails. */
    } finally {
      pumping.current = false;
      if (mounted.current) setPreparing(false);
    }
  }
  function prefetch(prompts: string[][]) {
    upcoming.current = prompts
      .slice(0, 3)
      .filter((s) => !cache.current.has(JSON.stringify(s)));
    void pump();
  }
  async function play(segments: string[], onStart: () => void) {
    if (!loaded.current)
      throw new Error(
        "The voice is still loading. Wait a moment or choose Device voice.",
      );
    cancel();
    foreground.current = true;
    const token = playback.current;
    try {
      context.current ??= new AudioContext();
      await context.current.resume();
      if (token !== playback.current) throw new Error("Cancelled");
      setStatus("generating");
      setMessage("Getting the word ready…");
      const result = await audio(segments);
      if (token !== playback.current || !mounted.current)
        throw new Error("Cancelled");
      const ctx = context.current;
      const samples = new Float32Array(result.samples!);
      const buffer = ctx.createBuffer(1, samples.length, result.rate!);
      buffer.copyToChannel(samples, 0);
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      source.current = node;
      foreground.current = false;
      setStatus("playing");
      setMessage("");
      void pump();
      await new Promise<void>((resolve, reject) => {
        playReject.current = reject;
        node.onended = () => {
          if (source.current !== node) return;
          source.current = null;
          playReject.current = null;
          setStatus("ready");
          resolve();
        };
        node.start();
        onStart();
      });
    } catch (e) {
      if (
        token !== playback.current ||
        !mounted.current ||
        (e instanceof Error && e.message === "Cancelled")
      )
        throw new Error("Cancelled");
      foreground.current = false;
      setStatus(loaded.current ? "ready" : "error");
      setMessage(e instanceof Error ? e.message : "Could not play voice.");
      throw e;
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current++;
      playback.current++;
      upcoming.current = [];
      worker.current?.terminate();
      worker.current = null;
      loaded.current = false;
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.reject(new Error("Cancelled"));
        pending.current = null;
      }
      source.current?.stop();
      playReject.current?.(new Error("Cancelled"));
      void context.current?.close();
    };
  }, []);
  return {
    status,
    message,
    load,
    play,
    cancel,
    cancelDownload,
    prefetch,
    preparing,
    preparedCount,
    ready: loaded.current,
  };
}
