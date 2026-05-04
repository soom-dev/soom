/**
 * Direct re-export of the anime.js subset the runtime uses. The build
 * inlines anime.js into the IIFE bundle (no `external` flag) so the
 * generated HTML ships a single combined script instead of a separate
 * UMD bundle plus a `globalThis.anime` shim. Bun's tree-shaker honors
 * anime.js's `sideEffects: false` and drops the modules we never call
 * (canvas/draggable/svg-on-canvas/etc.). Anything outside `src/runtime/`
 * must still keep its anime.js imports type-only to avoid re-inlining.
 */
export {
  createTimeline,
  createScope,
  createAnimatable,
  animate,
  stagger,
  svg,
  text,
} from 'animejs';
export type { Timeline, Scope } from 'animejs';
