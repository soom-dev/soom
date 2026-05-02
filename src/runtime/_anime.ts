/**
 * Runtime shim that exposes anime.js as ESM-style named exports while
 * resolving values from `globalThis.anime` (set by the inlined UMD bundle
 * via `output/anime-loader.ts`).
 *
 * Why this layer exists: the runtime is built with `external: ['animejs']`
 * so the bundle stays small (no anime.js inlined twice — once by the runtime
 * and once by anime-loader). Browsers can't resolve a bare `import { ... }
 * from 'animejs'` without an importmap, so every other module in
 * `src/runtime/` imports from `./_anime.js` instead of the package directly.
 *
 * Types come from the real package (erased at build time); values come from
 * `globalThis.anime`. The destructuring runs once at module load.
 */
import type * as Anime from 'animejs';

const animeGlobal = (globalThis as unknown as { anime: typeof Anime }).anime;

if (!animeGlobal) {
  throw new Error(
    'soom-runtime: anime.js global not found — load the UMD bundle (output/anime-loader.ts) before runtime.js'
  );
}

export const createTimeline = animeGlobal.createTimeline;
export const createScope = animeGlobal.createScope;
export const createAnimatable = animeGlobal.createAnimatable;
export const animate = animeGlobal.animate;
export const stagger = animeGlobal.stagger;
export const svg = animeGlobal.svg;
export const text = animeGlobal.text;

export type { Timeline, Scope } from 'animejs';
