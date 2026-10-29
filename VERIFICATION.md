# Prototype verification

Date: 2026-10-27
Session: 3d088187-9ac8-48b0-a60d-eec0c4efb2b5

- `npm run build`: passed, strict TypeScript and Vite production build.
- `npm test`: 16 tests passed (parsing, normalization, input limits, queue rotation, assisted answers, completion, backup validation).
- `npm audit --registry=https://registry.npmjs.org`: zero reported vulnerabilities.
- Real Chrome browser: create list, visual study, wrong-answer correction and retry, peek-assisted answer without credit, independent answers, complete harvest, reload recovery, backup export and restore all passed.
- Browser speech: local English voices enumerated, speech start event unlocked answer entry, correct audio-mode answer advanced the garden. Audible quality and pronunciation were not evaluated by a human.
- Switch to silent mode: passed. Missing-voice and remote-provider failure conditions are implemented but not simulated in this run.
- Native grown-up dialog: modal state and Escape dismissal passed.
- Viewports 1360px, 390px and 320px exercised; no horizontal overflow at phone widths. 100-word list supported with 24 aggregate visible plots.
- No browser page errors observed.

Evidence: `../rovodev-captures/20261027-word-garden/` contains desktop/mobile screenshots, video recordings, HAR, trace.zip, voice availability, and backup sample. Open the screenshots for human visual acceptance. Trace viewer: `bash ../rovodev-captures/20261027-word-garden/view-trace.command`.

## UX refinement verification (same day)

- Build and all 64 tests passed; npm audit reported zero vulnerabilities.
- Browser checks passed for side-by-side desktop layout, practice-first phone layout (390px and 320px), letter corrections, Enter-to-continue, peek/pause/resume protection, hidden child-facing voice settings, filtered novelty voices, slow speech, voice preview, native dialog dismissal, and complete harvest without horizontal overflow.
- Evidence: `../rovodev-captures/20261027-word-garden-refined/` contains screenshots, video, HAR, and trace. Human visual and listening acceptance remain pending. Neural speech was researched, not installed or benchmarked.

## Optional Kokoro integration verification

- Production build passed. All 81 tests passed; npm audit reported zero vulnerabilities after overriding the transitive sharp dependency to ^0.35.5 (not used in browser speech).
- Real Chrome downloaded/prepared q8 WASM Kokoro, generated Heart voice preview and practice audio, unlocked the answer field and accepted a correct typed answer.
- Confirmed no model/worker/WASM requests on initial app load. Cancellation of download, retry, pause during generation, and explicit device-voice fallback passed.
- Observed real device speech start/end events for `seed`, `Plant a seed in the soil.`, `seed`; both pauses exceeded 850ms with a configured 900ms timer. Kokoro gaps are inserted as exactly 900ms of zero PCM samples, covered by unit tests.
- One development run prepared in ~9.7 seconds and generated the first preview in ~7.2 seconds. Not a benchmark; memory, cold-cache performance, Safari and mobile devices remain untested.
- Captured asset traffic used GET requests to Hugging Face/CDN and jsDelivr, with no request bodies. This is local inference with remote asset downloads, not an entirely network-free setup.
- Evidence: `../rovodev-captures/20261027-word-garden-kokoro/` includes trace, screenshots, video, network summary and device-pacing.json. Human listening/quality approval remains pending.

## Reported seed pronunciation issue

User reported Kokoro speaking 'a seed' for the isolated word 'seed'. Raw phonemizer output was `sˈiːd` for seed/seed./Seed., versus `ɐ sˈiːd` for a seed, so no article was inserted by text phonemization. Applied a general utterance-boundary mitigation: isolated neural word segments are now capitalized and period-terminated (Seed.), while the example sentence is unchanged. Cached audio keys use the formatted input. Build and 90 tests passed. Actual before/after audio captured at `../rovodev-captures/20261027-seed-pronunciation/before.wav` and `after-stable.wav`. The outputs differ, but this does NOT establish an audible fix; human listening confirmation is required. No hard-coded seed exception or guessed audio trimming used.

## Saved settings and look-ahead preparation

- Explicit Save changes writes validated voice preferences to IndexedDB; Cancel/Escape restores saved preferences. Browser tests confirmed persistence across refresh and cancellation of unsaved engine/rate changes.
- Saved automatic-preparation opt-in reloads the model on return. Browser test blocked repeat ONNX model download requests after refresh: preparation and three upcoming prompts still succeeded from cache; zero model network requests were attempted. Cache entries recorded for inspection.
- Current plus next two prompts are prepared in a serialized background queue with a bounded six-prompt session cache. Playback cancellation preserves the loaded model and silently finishes any current inference; explicit download cancellation terminates the worker.
- Observed prefetched click-to-answer-enabled latency: 429ms first prompt, 107ms next prompt, one local Chrome run. Not a cross-device performance guarantee.
- Build, 146 unit tests and dependency audit passed. Evidence: `../rovodev-captures/20261027-word-garden-cache/`.

## Browser-local photo OCR

- Tesseract.js 7 with English model and worker/WASM assets served on the app origin. Build and 168 tests passed; npm audit reported zero vulnerabilities.
- Real browser recognition of a generated printed worksheet correctly recovered apple, seed, sunshine, carrot, leaf after cropping its heading. Tested in Vite development and production preview.
- Browser flow verified crop slider, rotation control, cancellation/retry, editable words, deselection, required confirmation, append preserving typed content, garden creation, unsupported file rejection, discard during recognition, and 390px layout without overflow.
- Observed OCR requests were GET-only to the app origin (plus local blob reads). No external OCR requests, POSTs, or image uploads. Image blobs are revoked on completion/cancel/unmount; no photo persistence implemented.
- Evidence: `../rovodev-captures/20261027-word-garden-ocr/`, including input fixture, screenshots, video, HAR, result.json, trace.
- Real photographed worksheets, blur/lighting variability, complex columns, handwriting, touch crop gestures on actual phones, and Safari still require testing. No broad accuracy claim based on one clean fixture.

## Sentence and definition helpers (2026-10-28)

- Added sentence/definition buttons using selected voice. Supplied sentences override saved/bundled help. Local starter vocabulary avoids network lookup for common words; definitions mask the target spelling on screen.
- Free Dictionary API is an optional explicit-consent adult lookup, not direct child-facing content. Selection/review required before persistent use; Wiktionary/CC attribution retained. Saved word help is separate from garden backup.
- Browser checks passed: real device speech content, real Kokoro sentence and definition generation/playback, no dictionary requests for local content, missing-entry guidance, consent gating, real volcano lookup, adult editing/save, reload reuse without another lookup, assisted scoring after answer-revealing editor, 320px layout, simulated 503 fallback.
- Build and 176 tests passed; audit zero vulnerabilities. Evidence: `../rovodev-captures/20261028-word-help/`.
- Adult labeling is not an authentication gate; supervision and broader K–6 content review remain required. Starter vocabulary is limited; arbitrary words do not automatically have child-ready definitions/examples.

## Plain-language copy pass (2026-10-28)

Reviewed homepage, editor, practice, feedback, completion, photo review, word help, voice settings, errors and page metadata. Replaced slogans and abstract learning terms with direct instructions; retained privacy disclosures, limits, saved/cancel semantics and source/license credit. Corrected oversimplified starter definitions to keep them accurate. No learning rules or storage formats changed. Build and all 176 tests passed.

## Shared-device profiles and gardens (2026-10-28)

- Added nickname + eight pixel avatar picker, independent child garden collections, new-list creation without replacement, rename, archive/unarchive and confirmed profile deletion. Voice preferences/Kokoro and approved word help remain device-shared; no accounts or sync.
- Existing v1 single-garden IndexedDB migrated into Gardener 1 with progress preserved, original key retained, corrupt data fails closed. Family backups export all profiles/gardens plus approved word help; legacy garden import adds to selected profile.
- Browser checks passed: two children/three gardens, independent progress, avatar/name changes, archives, reload, family export/restore, seeded v1 migration, 320px picker/dialog layout, actual device speech stopped when switching children. No page errors.
- Build, 275 tests and dependency audit passed. Evidence: `../rovodev-captures/20261028-word-garden-family/`.
- Concurrent-tab edits remain unsupported; use one active app tab. Shared neural model survives profile switches by design; new multi-profile Kokoro playback not separately exercised in this pass. Human visual acceptance remains pending.

Not yet verified: Safari/iPad/Android, screen-reader audit, human child usability, pronunciation, storage failure injection, offline operation, public privacy/legal readiness. No public deployment performed.
