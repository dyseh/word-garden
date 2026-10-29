import { createWorker, OEM, PSM } from "tesseract.js";
self.onmessage = async (event: MessageEvent<{ url: string }>) => {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    const base = new URL(
      `${import.meta.env.BASE_URL}ocr/`,
      self.location.origin,
    ).href;
    worker = await createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: base + "worker.min.js",
      corePath: base,
      langPath: base,
      gzip: true,
      logger: (m) =>
        self.postMessage({
          type: "progress",
          status:
            m.status === "recognizing text" ? "Reading words…" : "Setting up…",
          progress: Math.max(0, Math.min(1, m.progress ?? 0)),
        }),
    });
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(event.data.url, {}, { text: true });
    self.postMessage({
      type: "result",
      text: data.text,
      confidence: data.confidence,
    });
  } catch (e) {
    self.postMessage({
      type: "error",
      message:
        e instanceof Error ? e.message : "Something went wrong. Try again.",
    });
  } finally {
    await worker?.terminate();
  }
};
