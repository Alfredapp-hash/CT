// Copies the latin woff2 files the site uses from @fontsource into src/fonts/ (self-hosted, no Google Fonts request).
// Weights: Cormorant Garamond 500/600/700 + 500 italic; Outfit 300/400/500/600 — the same set the Google Fonts link used to load.
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "src/fonts");
mkdirSync(out, { recursive: true });
export const FONTS = [
  ["cormorant-garamond", "cormorant-garamond-latin-500-normal.woff2"],
  ["cormorant-garamond", "cormorant-garamond-latin-500-italic.woff2"],
  ["cormorant-garamond", "cormorant-garamond-latin-600-normal.woff2"],
  ["cormorant-garamond", "cormorant-garamond-latin-700-normal.woff2"],
  ["outfit", "outfit-latin-300-normal.woff2"],
  ["outfit", "outfit-latin-400-normal.woff2"],
  ["outfit", "outfit-latin-500-normal.woff2"],
  ["outfit", "outfit-latin-600-normal.woff2"],
];
for (const [pkg, file] of FONTS) copyFileSync(resolve(root, "node_modules/@fontsource", pkg, "files", file), resolve(out, file));
console.log(`sync-fonts: copied ${FONTS.length} woff2 files to src/fonts/`);
