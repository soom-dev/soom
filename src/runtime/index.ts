import type { AnimationScene } from '../animation/scene/types.js';
import { resolveElements } from './elements.js';
import { buildTimeline } from './timeline.js';
import { bindPersistentEffects } from './persistent.js';
import { bindAnnotations } from './annotations.js';
import { bindFlowParticles } from './particles.js';
import { exposeApi, type SoomAnimationApi } from './api.js';

/**
 * Entry point for the Hansoom runtime bundle. Browser-side code parses the
 * inlined Scene JSON and boots the animation. Wired in R3; consumed by
 * pipeline.ts in R4.
 */
export function bootRuntime(sceneJson: string): SoomAnimationApi {
  const scene = JSON.parse(sceneJson) as AnimationScene;
  const svgRoot = document.querySelector<SVGSVGElement>('.diagram-container svg');
  if (!svgRoot) throw new Error('soom: SVG diagram container not found');

  const els = resolveElements(scene, svgRoot);
  const built = buildTimeline(scene, els);
  const persistent = bindPersistentEffects(built.timeline, scene, els);
  const annotations = bindAnnotations(scene);
  bindFlowParticles(built.timeline, scene, els);

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
