import { createTimeline, type Timeline } from 'animejs';
import type { AnimationScene } from '../animation/scene/types.js';
import type { ResolvedElements } from './elements.js';

/**
 * Build the master anime.js timeline from the AnimationScene + resolved DOM.
 * R2 returns an empty paused timeline; R3 lays in the per-step segments.
 */
export function buildTimeline(scene: AnimationScene, els: ResolvedElements): Timeline {
  void scene;
  void els;
  return createTimeline({ autoplay: false });
}
