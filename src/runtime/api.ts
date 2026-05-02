import type { Timeline } from './_anime.js';
import type { AnimationScene, EdgeId } from '../animation/scene/types.js';
import type { AnnotationBindings } from './annotations.js';
import type { PersistentBindings } from './persistent.js';
import type { ResolvedElements } from './elements.js';

/**
 * Public surface exposed on `window.soomAnimation`. Shape mirrors the existing
 * codegen runtime in `src/animation/runtime/playback-api.ts` (lines 50–87) so
 * `output/controls.ts` and embedded consumers see no change at the cutover (R4).
 */
export interface SoomAnimationApi {
  timeline: Timeline;
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBackward(): void;
  goToStep(n: number): void;
  reset(): void;
  setSpeed(multiplier: number): void;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly progress: number;
}

export interface ApiContext {
  timeline: Timeline;
  scene: AnimationScene;
  els: ResolvedElements;
  stepOffsets: number[];
  stepEndOffsets: number[];
  persistent: PersistentBindings;
  annotations: AnnotationBindings;
}

export function exposeApi(ctx: ApiContext): SoomAnimationApi {
  const { timeline, scene, persistent, annotations, stepOffsets, stepEndOffsets } = ctx;
  const totalSteps = scene.steps.length;

  const getCurrentStepIndex = (): number => {
    const t = timeline.currentTime;
    for (let i = stepOffsets.length - 1; i >= 0; i--) {
      if (t >= stepOffsets[i]) return i;
    }
    return -1;
  };

  const collectActiveEdges = (idx: number): EdgeId[] => {
    if (idx < 0 || idx >= scene.steps.length) return [];
    return scene.steps[idx].activate.edges.slice();
  };

  const seekToStep = (n: number): void => {
    persistent.resetMarching();
    persistent.stopFocus();
    if (n <= 0) {
      timeline.seek(0, true);
      annotations.clear();
      return;
    }
    if (n > totalSteps) n = totalSteps;
    timeline.seek(stepEndOffsets[n - 1], true);
    if (n - 1 < scene.steps.length) annotations.setStep(scene.steps[n - 1]);
  };

  const api: SoomAnimationApi = {
    timeline,
    play: (): void => {
      persistent.stopFocus();
      timeline.play();
    },
    pause: (): void => {
      timeline.pause();
      const idx = getCurrentStepIndex();
      const edges = collectActiveEdges(idx);
      persistent.startFocus(edges);
      if (edges.length > 0) annotations.setActiveEdges(edges);
    },
    stepForward: (): void => {
      const cur = getCurrentStepIndex() + 1;
      if (cur < totalSteps) {
        timeline.pause();
        seekToStep(cur + 1);
      }
    },
    stepBackward: (): void => {
      const cur = getCurrentStepIndex() + 1;
      if (cur > 0) api.goToStep(cur - 1);
    },
    goToStep: (n: number): void => {
      timeline.pause();
      seekToStep(n);
    },
    reset: (): void => {
      persistent.resetMarching();
      persistent.stopFocus();
      timeline.cancel();
      timeline.seek(0, true);
      annotations.clear();
    },
    setSpeed: (multiplier: number): void => {
      timeline.playbackRate = multiplier > 0 ? multiplier : 1;
    },
    get currentStep(): number {
      return getCurrentStepIndex() + 1;
    },
    get totalSteps(): number {
      return totalSteps;
    },
    get progress(): number {
      return timeline.progress;
    },
  };

  return api;
}
