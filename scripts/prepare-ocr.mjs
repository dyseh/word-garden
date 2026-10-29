import { mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, "public/ocr");
await mkdir(target, { recursive: true });
const pkg = (name) => dirname(require.resolve(`${name}/package.json`));
await copyFile(
  join(pkg("tesseract.js"), "dist/worker.min.js"),
  join(target, "worker.min.js"),
);
await copyFile(
  join(pkg("tesseract.js"), "dist/worker.min.js.LICENSE.txt"),
  join(target, "worker.LICENSE.txt"),
);
for (const variant of ["lstm", "simd-lstm", "relaxedsimd-lstm"])
  for (const suffix of ["wasm.js", "wasm"]) {
    const file = `tesseract-core-${variant}.${suffix}`;
    await copyFile(join(pkg("tesseract.js-core"), file), join(target, file));
  }
await copyFile(
  join(pkg("tesseract.js-core"), "LICENSE"),
  join(target, "core.LICENSE"),
);
await copyFile(
  join(pkg("@tesseract.js-data/eng"), "4.0.0_best_int/eng.traineddata.gz"),
  join(target, "eng.traineddata.gz"),
);
// Retain dictionary and spell-checker attribution in the distributed app.
for (const name of ["dictionary-en", "dictionary-en-gb", "nspell"]) {
  const directory = dirname(require.resolve(name));
  const license =
    name === "nspell"
      ? join(directory, "../license")
      : join(directory, "license");
  await copyFile(license, join(target, `${name}.LICENSE`));
}
console.log("Prepared self-hosted OCR assets.");
