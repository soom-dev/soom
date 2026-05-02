/// <reference types="bun-types" />
import { rmSync, existsSync, statSync } from 'node:fs';

const OUT_DIR = 'dist-runtime';
const ENTRY = 'src/runtime/index.ts';
const OUT_FILE = `${OUT_DIR}/runtime.js`;

if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true });
}

// `external: ['animejs']` keeps the runtime bundle small (~1 KB skeleton in R2)
// because anime.js is loaded separately by output/anime-loader.ts at HTML
// assembly time. R3 wires the resolution so the inlined runtime can `import
// { ... } from 'animejs'` against a globalThis-attached anime module.
const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: OUT_DIR,
  target: 'browser',
  minify: true,
  external: ['animejs'],
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

if (sizeKb > 10) {
  console.error(`✗ Runtime bundle exceeded 10 KB sanity ceiling (${sizeKb.toFixed(2)} KB).`);
  process.exit(1);
}
