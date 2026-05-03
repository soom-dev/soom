import type { Timeline } from './_anime.js';
import type { AnimationScene, EdgeId, NodeId } from '../animation/scene/types.js';
import type { AnnotationBindings } from './annotations.js';
import type { PersistentBindings } from './persistent.js';
import type { ResolvedElements } from './elements.js';

const SHADOW_COMPLETED = 'drop-shadow(-4px 7px 12px var(--soom-shadow-completed))';

function applyCompletedThroughStep(scene: AnimationScene, els: ResolvedElements, n: number): void {
  const markNode = (nid: NodeId): void => {
    const el = els.nodes.get(nid);
    if (!el) return;
    el.classList.remove('soom-node-active');
    el.classList.add('soom-node-completed');
    el.style.filter = SHADOW_COMPLETED;
  };
  for (let i = 0; i < n && i < scene.steps.length; i++) {
    const step = scene.steps[i];
    for (const nid of step.activate.nodes) markNode(nid);
    for (const eid of step.activate.edges) {
      const edge = scene.elements.edges[eid];
      if (!edge) continue;
      const path = els.edges.get(eid);
      if (path) path.classList.add('soom-edge-completed');
      if (edge.target) markNode(edge.target);
    }
  }
}

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
    if (n > totalSteps) n = totalSteps;
    if (n < 0) n = 0;
    timeline.seek(n === 0 ? 0 : stepEndOffsets[n - 1], false);
    // anime.js v4 `seek` only fires `timeline.call(...)` callbacks near the
    // target time, not across the full 0..t range — so the per-step class
    // toggles never replay during a jump-seek. Worse, callbacks crossed by
    // the seek path can leave stale state (e.g. a "step start" callback adds
    // `soom-node-active` but the matching "step end" never fires to remove
    // it, producing active+completed conflicts on backward jumps). Clear
    // every node/edge first, then re-apply completed for steps 0..n-1 from
    // scratch — gives a deterministic post-seek state regardless of jump
    // direction. R7 can revisit if anime.js gains a "replay all callbacks"
    // flag.
    for (const el of ctx.els.nodes.values()) {
      el.classList.remove('soom-node-active', 'soom-node-completed');
      el.style.removeProperty('filter');
    }
    for (const path of ctx.els.edges.values()) {
      path.classList.remove('soom-edge-completed');
    }
    applyCompletedThroughStep(scene, ctx.els, n);
    if (n === 0) {
      annotations.clear();
    } else if (n - 1 < scene.steps.length) {
      annotations.setStep(scene.steps[n - 1]);
    }
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
      timeline.seek(0, false);
      for (const el of ctx.els.nodes.values()) {
        el.classList.remove('soom-node-active', 'soom-node-completed');
        el.style.removeProperty('filter');
      }
      for (const path of ctx.els.edges.values()) {
        path.classList.remove('soom-edge-completed');
      }
      annotations.clear();
    },
    setSpeed: (multiplier: number): void => {
      // anime.js v4 exposes per-instance playback rate as `speed` on the
      // Clock base class (`createTimeline` extends Timer extends Clock).
      // The init-param key `playbackRate` only configures the initial rate;
      // it does NOT exist as a runtime property — assigning to it silently
      // drops the value, which is why setSpeed appeared to work but didn't.
      timeline.speed = multiplier > 0 ? multiplier : 1;
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
