/// <reference types="bun-types" />
import { rmSync, existsSync, statSync } from 'node:fs';

const OUT_DIR = 'dist-runtime';
const ENTRY = 'src/runtime/index.ts';
const OUT_FILE = `${OUT_DIR}/runtime.js`;

if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true });
}

// Anime.js is bundled INTO the runtime so the emitted HTML ships a single
// combined IIFE instead of a separate UMD + globalThis.anime shim. Bun's
// tree-shaker honors anime.js's `sideEffects: false` and drops the modules
// the runtime never calls (canvas, draggable, scroll observer, etc.).
//
// `format: 'iife'` wraps the whole bundle in a self-executing function so
// the produced JS is legal inside a classic inline `<script>` (no `export`
// keyword leaks). `src/runtime/index.ts` writes `bootRuntime` to
// `globalThis` at load time so the boot `<script>` emitted in
// `output/html.ts` can call it after the bundle executes.
const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: OUT_DIR,
  target: 'browser',
  minify: true,
  format: 'iife',
  naming: 'runtime.[ext]',
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

if (!existsSync(OUT_FILE)) {
  console.error(`✗ Expected ${OUT_FILE} but it was not produced.`);
  process.exit(1);
}

const sizeKb = statSync(OUT_FILE).size / 1024;
console.log(`✓ Built runtime bundle: ${OUT_FILE} (${sizeKb.toFixed(2)} KB)`);

// Anime.js is now inlined (tree-shaken). The combined IIFE replaces the
// separate UMD script + 10 KB shim, so the ceiling tracks the new total.
const CEILING_KB = 100;
if (sizeKb > CEILING_KB) {
  console.error(
    `✗ Runtime bundle exceeded ${CEILING_KB} KB sanity ceiling (${sizeKb.toFixed(2)} KB).`
  );
  process.exit(1);
}
