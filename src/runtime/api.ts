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
    if (n <= 0) {
      timeline.seek(0, false);
      // Clear any class state left over from a previous forward run.
      for (const el of ctx.els.nodes.values()) {
        el.classList.remove('soom-node-active', 'soom-node-completed');
        el.style.removeProperty('filter');
      }
      for (const path of ctx.els.edges.values()) {
        path.classList.remove('soom-edge-completed');
      }
      annotations.clear();
      return;
    }
    if (n > totalSteps) n = totalSteps;
    timeline.seek(stepEndOffsets[n - 1], false);
    // anime.js v4 `seek` only fires `timeline.call(...)` callbacks near the
    // target time, not across the full 0..t range — so the per-step
    // class-swap callbacks from earlier steps never run during a jump-seek.
    // Mirror the v1 runtime by walking steps[0..n-1] and applying the
    // completed appearance directly. R7 can revisit if anime.js gains a
    // "replay all callbacks" flag.
    applyCompletedThroughStep(scene, ctx.els, n);
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
