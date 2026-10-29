# Word Garden

A browser-based spelling game for children in kindergarten through sixth grade. Children practice their own word lists and grow a pixel-art garden. Families sharing a device can create separate profiles, each with its own gardens and progress.

**Status:** working local prototype. No backend, accounts, cross-device sync, or public deployment yet.

**Current checkout:** `/Users/shussain/word-garden` (`~/word-garden`).

## Quick start

Use Node.js 24 and npm. No API keys or environment variables are needed.

```bash
cd ~/word-garden
npm ci --registry=https://registry.npmjs.org
npm run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173/**. Keep the terminal running. Press `Ctrl+C` in that terminal to stop the server.

The first command installs dependencies from the lockfile. Before starting, `predev` copies the OCR worker, WebAssembly files, and English language model into `public/ocr/`. This directory is generated, not maintained by hand.

### Open it on other devices on your Wi-Fi

Stop the existing development server, then run:

```bash
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Vite prints a network URL such as `http://192.168.x.x:5173/`. Open the URL containing your Mac's Wi-Fi address on another device. To find that address on this Mac:

```bash
ipconfig getifaddr en0
```

- Keep the Mac awake and connected to the same network.
- Allow incoming Node.js connections if macOS asks. Firewall rules, VPN software, or guest Wi-Fi isolation can block access.
- Use trusted Wi-Fi only. Binding to `0.0.0.0` listens on all available network interfaces. Do not port-forward this development server to the internet.
- A listening server does not prove another device can reach it. Test from the phone or tablet itself.
- Plain HTTP at a network IP is not a secure browser context. Cache APIs and other capabilities may be unavailable; use trusted HTTPS for reliable full-feature testing. HTTPS setup is not included.

**Storage belongs to the browser and URL origin, not the server.** Different devices have different profiles and progress. Even `localhost`, `127.0.0.1`, and the LAN IP are separate origins on the same device. If your profiles appear missing after changing the URL, return to the original URL and export a family backup. Data does not transfer automatically.

## What the app does

| Feature | Current behavior |
| --- | --- |
| Child profiles | Nickname and one of eight pixel animal avatars. No personal account required. |
| Multiple gardens | Each child has separate lists, rounds, and progress. New lists do not replace old gardens. |
| Listen & spell | Hear the word, type it, and check the spelling. |
| Look & remember | See the word, hide it, then type it from memory. |
| Garden rewards | Correct answers without a peek grow plants. Finish the list to complete the garden. |
| Corrections | Letter tiles show missing, extra, and incorrect letters. Missed or assisted words return later in the round. |
| Photo import | Crop, rotate, recognize printed words locally, then edit and confirm them. |
| Word clues | Hear an example sentence or hear/read a definition. |
| Speech | Device voices or optional on-device Kokoro neural speech. |
| Backups | Export a single garden or the entire family, then restore from JSON. |

There are no countdowns, lost plants, or penalties for mistakes. A completed garden means the child finished that practice round, not that the words are permanently learned. Scheduled spaced reviews are not implemented yet.

## Using the app

### Create a gardener and a word list

1. Choose **Add a gardener**, enter a nickname, and pick a picture.
2. Add your own words or try the sample garden.
3. Give the garden a name, such as “Week 3,” and enter the list.
4. Check the words, then plant the garden.

Use one word per line, or separate plain words with commas. Add an optional example sentence after `|`:

```text
seed | Plant a seed in the soil.
apple | First, pick an apple.
there | Put the basket over there.
```

Put entries containing sentences on separate lines. Commas within those sentences are preserved. Duplicate words are removed without automatically correcting their spelling.

Limits: 30 profiles, 300 gardens in total, and 100 words per garden. English letters, apostrophes, and hyphens are supported. Words are limited to 40 characters and sentences to 250.

### Import a worksheet photo

In the list editor:

1. Choose **Add a photo** and select an image.
2. Drag around the words or use the crop sliders. Rotate if necessary.
3. Choose **Find my words**.
4. Edit errors, deselect headings, and confirm that you checked the spellings.
5. Add the selected words to the list. Existing typed words stay in place.

Supported files: JPG, PNG, and WebP, up to 20 MB and 40 megapixels. Images are resized to a maximum side length of 2400 pixels before recognition. Convert HEIC or PDF files to a supported image first.

Printed English lists work best. Handwriting, blur, lighting, and complex columns can reduce accuracy. Crop columns separately if needed. OCR does not invent sentences or definitions.

The image stays in memory. Cropped image URLs are released on completion, cancellation, removal, or leaving the editor. Photos are neither uploaded nor saved in IndexedDB. OCR files are served from the app's own origin.

### Switch between children

Use **My gardens** to return to the current child's collection or **Switch gardener** to return to the profile picker. Switching stops playback and preserves saved progress.

Rename gardens or use **Save away** to hide older lists without deleting them. **Bring back** restores an archived garden. Profile deletion is under **Grown-up tools** and requires confirmation.

Profiles separate progress, not permissions. They have no passwords, and siblings can open each other's gardens. Voice settings, downloaded speech assets, and approved word help are shared on the device.

### Choose a voice

From a garden, open **For grown-ups** and choose a **Voice type**:

- **Device voice:** uses browser/OS English voices. On-device voices are preferred. Online voices require permission and may send text to their provider.
- **Natural voice · Kokoro:** uses the Heart US English voice in a local WebAssembly worker. Choose **Load natural voice**, try it, then **Save changes**.

Kokoro's quantized model is approximately 92 MB, plus runtime and voice files. Assets currently come from Hugging Face/CDN and runtime hosts including jsDelivr. Speech generation runs locally, but initial setup is not network-free.

Enable **Load this voice when I open the app** to reuse cached assets and prepare the model when entering a garden. Loading into memory still takes time. Browsers can evict cached files, which then need downloading again.

The app prepares the current word and next two in the background. It keeps up to six generated prompts in a session cache. Pausing stops playback without discarding the loaded model. An active background computation can finish silently. Generated audio is not persisted across refreshes.

Both engines use this prompt:

```text
word → 0.9-second pause → supplied sentence → 0.9-second pause → word
```

Without a supplied sentence, the word repeats after one pause. **Kokoro always uses speed `1.0`.** Reduced model speed produced an extra leading vowel during testing; see [upstream issue #344](https://github.com/hexgrad/kokoro/issues/344). Slower playback controls apply only to device speech.

**Save changes** persists preferences. **Cancel** or Escape restores the previous settings. Previews and downloads happen immediately; Cancel does not delete downloaded assets.

### Use sentences and definitions

**Say it in a sentence** speaks an example without showing the spelling. **Definition** speaks and displays the meaning, masking occurrences of the target word in the displayed text.

Content comes from:

1. The supplied list sentence, when present.
2. Grown-up-approved help saved on this device.
3. A small bundled vocabulary with original child-friendly examples and meanings.

For missing help, a grown-up can write it or explicitly allow a one-word lookup using [Free Dictionary API](https://dictionaryapi.dev/). The service receives the word and the device's IP address, not a photo or full list. It is a general dictionary, not a children's dictionary. Results stay in the adult review screen until selected, edited, and saved. Wiktionary source links and returned license credit are retained.

Opening the word-help editor reveals the spelling and marks the current attempt as assisted. The “grown-up” label is not an authentication gate; adult supervision is still needed.

## Data, migration, and backups

All persistent application data is in IndexedDB through `idb-keyval`. No server database is used.

| Data | Storage and scope |
| --- | --- |
| Profiles and gardens | `word-garden-family-v2`; owned by profile and garden IDs |
| Voice preferences | `word-garden-voice-settings-v1`; shared across profiles |
| Approved word help | `word-garden-word-help-v1:<word>`; shared across profiles |
| Legacy garden | `word-garden-v1`; retained after migration |
| Downloaded models | Browser-managed caches where supported |
| Generated audio | Bounded in-memory caches; cleared on refresh |
| Uploaded photos | Memory only; not included in backups |

On first launch after upgrading, a valid legacy single garden moves into **Gardener 1**, preserving progress. Rename that profile and choose a picture. The original record is not deleted. Invalid saved family data is not overwritten silently.

### Backup choices

| Action | Includes | Restore behavior |
| --- | --- | --- |
| Export backup inside a garden | That garden's word list and progress | Adds a new garden to the selected child |
| Export family backup under Grown-up tools | All profiles, gardens, and approved word help | Replaces profiles/gardens after confirmation; word help merges by word |

Voice preferences and downloaded models are not included. Clearing browser data can erase progress and cached help. Export a family backup before clearing data or changing devices.

Use one active app tab at a time. Concurrent-tab conflict resolution is not implemented.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm ci --registry=https://registry.npmjs.org` | Install the locked dependencies |
| `npm run dev` | Generate OCR assets and start the local development server |
| `npm test` | Run unit tests with Vitest |
| `npm run build` | Generate OCR assets, type-check, and build `dist/` |
| `npm run preview -- --port 4173 --strictPort` | Serve the existing production build locally |
| `npm audit --registry=https://registry.npmjs.org` | Check dependency advisories |

The project uses React, TypeScript, Vite, IndexedDB, Tesseract.js, and Kokoro.js. Fonts and pixel-art sprites are bundled; there are no remote font requests.

### Source map

```text
src/
  FamilyApp.tsx          Profile picker, collections, persistence, family backups
  family.ts              Validated profile/garden model and legacy migration
  ProfileAvatar.tsx      Eight original pixel-art avatars
  App.tsx                List editor, practice flow, feedback, voice settings
  game.ts                Word parsing, answer rules, round progression
  Garden.tsx             Pixel-art garden scene
  spellingFeedback.ts    Letter-level answer comparison
  PhotoImport.tsx        Photo selection, crop/rotate, review and cleanup
  ocr.worker.ts          Local Tesseract recognition
  ocrWords.ts            Conservative extraction of possible words
  WordHelp.tsx           Sentence/definition controls and adult review
  dictionary.ts          Validated dictionary lookup and attribution
  coreDictionary.ts     Bundled starter definitions and examples
  useNaturalVoice.ts     Model lifecycle, queued generation, audio caching
  kokoro.worker.ts       Neural inference in a worker
  speechPrompt.ts        Prompt segments and explicit pauses
  kokoroText.ts          Isolated-word formatting
  voiceSettings.ts      Voice preference schema
  *.test.ts              Unit tests
scripts/
  prepare-ocr.mjs        Copies OCR assets into public/ocr before dev/build
```

`public/ocr/`, `dist/`, and `node_modules/` are generated and ignored by Git. Speech and OCR processing stay off the main UI thread.

For a future database integration, keep profile/garden IDs and validation in `family.ts`, and replace the storage boundary in `FamilyApp.tsx`. Add authentication, conflict handling, and migration/versioning deliberately rather than making local profiles behave like secure accounts.

## Verification and current gaps

The latest profile implementation passed the production build, **275 unit tests**, and Chrome browser flows for two children with three gardens, separate progress, migration, backup restoration, avatar edits, archive/unarchive, speech cancellation, and 320px layout.

Earlier browser checks covered real OCR, Kokoro generation/cache reuse, word clues, and dictionary failures. These are development checks, not a claim of broad device compatibility or educational effectiveness.

See [VERIFICATION.md](./VERIFICATION.md) for dated results and evidence locations. See [SPEECH-OPTIONS.md](./SPEECH-OPTIONS.md) for speech research and licensing caveats.

Still needed:

- Real-device Safari/iPad/Android testing and a screen-reader audit.
- Family usability testing, real worksheet coverage, and pronunciation review.
- Scheduled delayed review and learning progress across rounds.
- Database-backed sync, authentication, and concurrent-edit handling if required.
- PWA installation and a tested offline experience.
- Children's privacy/legal review, hosting security, and dependency/voice license review before public release.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| The page won't open | Ensure the server is running. Check the URL printed by Vite. |
| Port 5173 is in use | Stop the previous app server or choose another port. Changing the port creates a different storage origin. |
| Another device can't connect | Same Wi-Fi, Mac awake, incoming connections allowed, no guest-network isolation or VPN blocking. |
| Profiles seem missing | Check the exact browser, host, port, and HTTP/HTTPS URL used before. Local data does not follow URL changes. |
| No speech | Pick an available English voice, use a button to start playback, or choose Look & remember. |
| Kokoro takes time after refresh | It must load cached model files into memory. Missing files download again. Check its status in voice settings. |
| OCR files fail to load | Run `npm run dev` or `npm run build` to generate assets. Deploy the entire `dist/`, including `ocr/`. |
| Photo words are wrong | Crop tightly, rotate upright, use clearer printed text, and edit the results. |
| No definition or example | Add it manually in grown-up word help; dictionary coverage and examples vary. |
| Changes aren't saving | Check the warning, available browser storage, and private-browsing restrictions. Export a family backup before closing. |

## Deploying later

This app can be hosted as static files. Run `npm run build` and publish the complete `dist/` directory over HTTPS, with JavaScript and WASM served correctly. `npm run preview` is for local checking, not a hardened public server.

Before launch, review host access logs, cache/security headers, children's privacy obligations, and third-party licenses. OCR assets are self-hosted already; Kokoro assets are not all self-hosted or revision-pinned yet. Dictionary lookup and opted-in remote device voices have separate network boundaries. No analytics or tracking is included in the application.

This project does not currently declare a repository-wide license. Review licensing and notices before distributing it publicly. Open-source dependencies and model weights have their own terms.
