import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Worker-only dependencies are not found by Vite's initial page scan.
    // Discovering them on the first OCR click would reload the page and lose
    // the selected gardener, unfinished word list, and photo.
    include: ["tesseract.js", "nspell"],
  },
});
