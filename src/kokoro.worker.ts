import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";
import { joinWithPauses } from "./speechPrompt";
import { kokoroSegmentText } from "./kokoroText";
const workerScope = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

// Single-threaded WASM needs no COOP/COEP headers and keeps computation off the UI.
env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
let tts: KokoroTTS | null = null;
const cache = new Map<string, { samples: Float32Array; rate: number }>();
let busy = false;
self.onmessage = async (
  event: MessageEvent<{
    id: number;
    type: "load" | "generate";
    segments?: string[];
  }>,
) => {
  const { id, type, segments = [] } = event.data;
  // Slower inference can introduce a phantom vowel: upstream Kokoro issue #344.
  const speed = 1;
  if (busy) {
    self.postMessage({
      id,
      type: "error",
      message: "The voice is busy. Stop it before trying again.",
    });
    return;
  }
  busy = true;
  try {
    if (type === "load") {
      tts = await KokoroTTS.from_pretrained(
        "onnx-community/Kokoro-82M-v1.0-ONNX",
        {
          dtype: "q8",
          device: "wasm",
          progress_callback: (p) => {
            if (p.status === "progress")
              self.postMessage({
                id,
                type: "progress",
                message: `Downloading voice files: ${Math.round(p.progress)}% (${p.file.split("/").pop()})`,
              });
            else if (p.status === "done")
              self.postMessage({
                id,
                type: "progress",
                message: "Preparing the natural voice…",
              });
          },
        },
      );
      // Fetch voice embedding and warm up inference before marking ready.
      self.postMessage({
        id,
        type: "progress",
        message: "Warming up the voice. This can take a moment…",
      });
      await tts.generate("Ready.", { voice: "af_heart", speed: 1 });
      self.postMessage({ id, type: "ready" });
    } else {
      if (!tts)
        throw new Error("Download and prepare the natural voice first.");
      if (
        segments.length < 1 ||
        segments.length > 3 ||
        segments.some((s) => typeof s !== "string" || s.length > 260)
      )
        throw new Error("This speech prompt is too long.");
      const chunks: Float32Array[] = [];
      let rate = 24000;
      for (const [index, segment] of segments.entries()) {
        const text = kokoroSegmentText(segment, index, segments.length);
        const key = JSON.stringify([text, speed]);
        let audio = cache.get(key);
        if (!audio) {
          const result = await tts.generate(text, { voice: "af_heart", speed });
          audio = { samples: result.audio, rate: result.sampling_rate };
          if (cache.size >= 12) cache.delete(cache.keys().next().value!);
          cache.set(key, audio);
        }
        if (audio.rate !== 24000)
          throw new Error("Unexpected speech sample rate.");
        rate = audio.rate;
        chunks.push(audio.samples);
      }
      const samples = joinWithPauses(chunks, rate);
      workerScope.postMessage({ id, type: "audio", samples, rate }, [
        samples.buffer as ArrayBuffer,
      ]);
    }
  } catch (e) {
    self.postMessage({
      id,
      type: "error",
      message: e instanceof Error ? e.message : "Natural voice failed.",
    });
  } finally {
    busy = false;
  }
};
