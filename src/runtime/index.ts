import type { AnimationScene } from '../animation/scene/types.js';
import { resolveElements } from './elements.js';
import { buildTimeline } from './timeline.js';
import { bindPersistentEffects } from './persistent.js';
import { bindAnnotations } from './annotations.js';
import { bindFlowParticles } from './particles.js';
import { exposeApi, type SoomAnimationApi } from './api.js';
import { prefersReducedMotion } from './preferences.js';

/**
 * Entry point for the Hansoom runtime bundle. Browser-side code parses the
 * inlined Scene JSON and boots the animation. Wired in R3; consumed by
 * pipeline.ts in R4.
 *
 * Accepts either an `AnimationScene` object or its JSON string form so
 * the inlined boot script can use `JSON.parse(...)` (the natural shape
 * for embedded `<script type="application/json">` payloads).
 */
export function bootRuntime(sceneOrJson: AnimationScene | string): SoomAnimationApi {
  const scene =
    typeof sceneOrJson === 'string' ? (JSON.parse(sceneOrJson) as AnimationScene) : sceneOrJson;
  const svgRoot = document.querySelector<SVGSVGElement>('.diagram-container svg');
  if (!svgRoot) throw new Error('soom: SVG diagram container not found');

  // `prefers-reduced-motion: reduce` is a critical-criticality a11y signal:
  // the timeline is built paused (autoplay: false) so we never auto-play, and
  // when the media query matches we additionally collapse per-segment
  // durations to ~150ms and skip the marching/focus/particle loops. Controls
  // remain visible so reduced-motion users can still step through manually.
  const reducedMotion = prefersReducedMotion();

  const els = resolveElements(scene, svgRoot);
  const built = buildTimeline(scene, els, { reducedMotion });
  const persistent = bindPersistentEffects(built.timeline, scene, els, { reducedMotion });
  const annotations = bindAnnotations(scene);
  bindFlowParticles(built.timeline, scene, els, { reducedMotion });

  // Marching line lifecycle: add to each edge as it completes inside the
  // timeline, reset on loop boundary (handled in persistent.ts via onLoop).
  for (const [edgeId, edge] of Object.entries(scene.elements.edges)) {
    const offset = scene.timing.idleGap; // placeholder; computed per-step in timeline.ts
    void offset;
    void edge;
    void edgeId;
  }

  return exposeApi({
    timeline: built.timeline,
    scene,
    els,
    stepOffsets: built.stepOffsets,
    stepEndOffsets: built.stepEndOffsets,
    persistent,
    annotations,
  });
}

export type { SoomAnimationApi };

// Expose `bootRuntime` on the global so the IIFE-bundled runtime can be
// invoked from a separate inline boot `<script>` after the bundle executes.
// Property name is preserved by the minifier (it's an external-object access);
// the local binding is mangled but the reference is captured here at module
// load time. The HTML emit path in `output/html.ts` reads `window.bootRuntime`.
(globalThis as unknown as { bootRuntime: typeof bootRuntime }).bootRuntime = bootRuntime;
