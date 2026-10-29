# Browser-local neural speech recommendation

Verified against upstream documentation on 2026-10-27. Kokoro.js 1.2.1 is now integrated as an optional q8/WASM Heart voice in a dedicated worker and exercised in Chrome on this development machine. Browser API event checks confirm playback; human pronunciation review and target-device benchmarks are still pending.

Observed development run: preparation approximately 9.6 seconds and first preview generation approximately 7.2 seconds. These are single-run observations, not performance guarantees or cold-cache benchmarks. Both speech engines now use explicit 900ms gaps. Requests observed for assets were GETs to Hugging Face/CDN and jsDelivr; no request bodies were sent in that run. Model weights and runtime assets are not all self-hosted yet.

## Recommended pilot: official kokoro-js

- Official JS library: https://github.com/hexgrad/kokoro/tree/main/kokoro.js
- Model: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- Upstream weights/model card: https://huggingface.co/hexgrad/Kokoro-82M
- Uses Transformers.js. Documented WASM and WebGPU backends. Example uses q8/WASM. Try af_heart and af_bella by listening; these are adult narrator voices, not child voices.
- Quantized model `onnx/model_quantized.onnx`: 92,361,116 bytes (~92.4 MB decimal). FP32: 325,532,232 bytes. FP16: 163,234,740 bytes. These are model-file sizes only; runtime, phonemizer, and voice files add to the download. Source: https://huggingface.co/api/models/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx?expand=false
- Free inference on the user's hardware, no per-word API fee. Hosting/bandwidth still have costs.
- Initial model download can be cached, but cache eviction/storage limits and runtime memory need real-device testing. No verified performance or memory claims here.
- The JS package and upstream weights declare Apache-2.0. This is not a complete redistribution audit: phonemizer.js uses eSpeak NG; inspect shipped transitive binaries, notices, and voice assets before a public release. Apache wrapper licensing does not settle every dependency obligation.
- By default the library fetches voice files from Hugging Face. For the desired privacy boundary, self-host pinned model/voice/runtime assets and verify that user text is never sent out. Fetching a model from a CDN is still a network request, even though inference is local.

## Why not adopt immediately?

Browser API support alone does not prove good performance on iPads, budget phones or school Chromebooks. Short isolated words, homophones and unusual school vocabulary need listening tests. Longer natural sentences can sound better than one-word prompts; both must pronounce the target correctly. Do not claim this is ready for all K–6 devices until measured.

## Integration shape

1. Adult chooses an optional 'Download natural voice' with accurate download size, progress and cancel.
2. Lazy-load engine in a worker; run one generation at a time; terminate worker on cancel/error when appropriate.
3. Generate on-device and cache bounded audio by text + voice + speed + model revision. Pre-generate the next few prompts rather than all words without bounds.
4. Guard stale requests when pausing, changing lists/voices, or leaving practice.
5. Keep browser speech and silent practice as explicit fallbacks. Never silently switch to cloud inference.
6. Test WASM first; benchmark WebGPU separately rather than assuming device availability or speed.
7. Measure initial download, ready-to-play time, later-word latency and memory on actual target devices. Human-review pronunciation before selection.

## Alternative: Piper-family browser ports

Potentially useful smaller per-voice models, but browser wrappers vary and their licenses differ. The current Piper successor uses GPL; that does not prohibit commercial use, but adds redistribution obligations. Voice licenses must be checked individually. Not selected as the first pilot without validating a specific maintained browser package.

## Device-voice improvements retained alongside Kokoro

Hide novelty OS voices, prefer ordinary narration voices, move controls to grown-up settings, provide steady/slower speed choices, a sample preview and a 'Hear it slowly' action. These improve control, not the underlying engine's quality.
