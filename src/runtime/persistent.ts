import type { Timeline } from 'animejs';
import type { AnimationScene } from '../animation/scene/types.js';
import type { ResolvedElements } from './elements.js';

/**
 * Wire up persistent effects (marching dotted line, focus loop, hover float).
 * R3 implements via `createScope` per system design §3.4; R2 is a no-op.
 */
export function bindPersistentEffects(
  tl: Timeline,
  scene: AnimationScene,
  els: ResolvedElements
): void {
  void tl;
  void scene;
  void els;
}
