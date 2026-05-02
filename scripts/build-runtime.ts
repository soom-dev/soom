/// <reference types="bun-types" />
import { rmSync, existsSync, statSync } from 'node:fs';

const OUT_DIR = 'dist-runtime';
const ENTRY = 'src/runtime/index.ts';
const OUT_FILE = `${OUT_DIR}/runtime.js`;

if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true });
}

// `external: ['animejs']` keeps the runtime small. Anime.js is loaded
// separately by `output/anime-loader.ts` as the UMD bundle, which sets
// `globalThis.anime`. The runtime imports from `./_anime.js` (a thin shim
// over `globalThis.anime`) instead of bare `'animejs'`, so the bundle has
// no unresolved imports and runs in a browser as-is.
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
  external: ['animejs'],
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

// Anime.js is external (loaded via globalThis.anime), so the bundle is just
// Hansoom logic. 12 KB ceiling gives some headroom over the current ~8 KB.
const CEILING_KB = 12;
if (sizeKb > CEILING_KB) {
  console.error(
    `✗ Runtime bundle exceeded ${CEILING_KB} KB sanity ceiling (${sizeKb.toFixed(2)} KB).`
  );
  process.exit(1);
}
