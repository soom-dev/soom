import type { AnimationScene } from '../animation/scene/types.js';
import { resolveElements } from './elements.js';
import { buildTimeline } from './timeline.js';
import { bindPersistentEffects } from './persistent.js';
import { exposeApi, type SoomAnimationApi } from './api.js';

/**
 * Entry point for the Hansoom runtime bundle. Browser-side code parses the
 * inlined Scene JSON and boots the animation. R3 will fill in the full
 * pipeline; R2 only exercises the wiring so the bundle compiles and exposes
 * an API of the right shape.
 */
export function bootRuntime(sceneJson: string): SoomAnimationApi {
  const scene = JSON.parse(sceneJson) as AnimationScene;
  const els = resolveElements(scene);
  const tl = buildTimeline(scene, els);
  bindPersistentEffects(tl, scene, els);
  return exposeApi(tl, scene);
}

export type { SoomAnimationApi };
