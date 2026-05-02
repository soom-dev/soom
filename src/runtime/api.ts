import type { Timeline } from 'animejs';
import type { AnimationScene } from '../animation/scene/types.js';

/**
 * Public surface exposed on `window.soomAnimation`. Shape mirrors the existing
 * codegen runtime in `src/animation/runtime/playback-api.ts` (lines 50–87) so
 * `output/controls.ts` and embedded consumers see no change at the cutover (R4).
 *
 * R2 ships skeleton implementations that throw — R3 fills them in.
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

export function exposeApi(timeline: Timeline, scene: AnimationScene): SoomAnimationApi {
  void scene;
  const fail = (m: string): never => {
    throw new Error(`not implemented (R3): ${m}`);
  };
  return {
    timeline,
    play: () => fail('play'),
    pause: () => fail('pause'),
    stepForward: () => fail('stepForward'),
    stepBackward: () => fail('stepBackward'),
    goToStep: () => fail('goToStep'),
    reset: () => fail('reset'),
    setSpeed: () => fail('setSpeed'),
    get currentStep() {
      return 0;
    },
    get totalSteps() {
      return 0;
    },
    get progress() {
      return 0;
    },
  };
}
