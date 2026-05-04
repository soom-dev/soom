import { animate, createScope, type Scope, type Timeline } from './_anime.js';
import type { AnimationScene, EdgeId } from '../animation/scene/types.js';
import type { ResolvedElements } from './elements.js';

const FOCUS_DURATION = 700;

export interface PersistentBindings {
  /** Revert all marching-line animations and clear added inline styles. */
  resetMarching(): void;
  /** Start the focus loop on edges currently being revealed (called on pause). */
  startFocus(activeEdgeIds: EdgeId[]): void;
  /** Stop the focus loop (called on play). */
  stopFocus(): void;
  /** Add a marching line to a single edge (called from `timeline.call` segments). */
  startMarching(edgeId: EdgeId): void;
}

export interface BindPersistentOptions {
  /**
   * When true, both the marching-line and the focus loop are disabled —
   * `startMarching` / `startFocus` become no-ops. The continuously-running
   * `createScope` animations are the primary "decorative motion" the runtime
   * emits during/after step playback, so reduced-motion users skip them
   * entirely rather than just shortening their durations.
   */
  reducedMotion?: boolean;
}

/**
 * Wire up persistent effects (marching dotted line on completed edges,
 * focus loop on edges revealing while paused).
 *
 * Implementation uses two `createScope` instances so we can revert each
 * lifecycle independently:
 * - `marchScope`: contains all marching-line animations on completed edges.
 *   Reverted on `timeline.onLoop` so the next loop starts clean.
 * - `focusScope`: contains the per-pause focus animations. Reverted on play.
 */
export function bindPersistentEffects(
  tl: Timeline,
  scene: AnimationScene,
  els: ResolvedElements,
  options?: BindPersistentOptions
): PersistentBindings {
  void scene;

  if (options?.reducedMotion) {
    // Both effects are continuously-looping motion that adds no information
    // beyond the step's class state. Reduced-motion users get the static
    // completed/active appearance only.
    const noop = (): void => {
      /* noop */
    };
    return {
      resetMarching: noop,
      startFocus: noop,
      stopFocus: noop,
      startMarching: noop,
    };
  }

  let marchScope: Scope | null = null;
  let focusScope: Scope | null = null;

  const marchPattern = computeMarchPattern(els);

  const resetMarching = (): void => {
    marchScope?.revert();
    marchScope = null;
    for (const path of els.edges.values()) {
      path.style.removeProperty('stroke-dasharray');
      path.style.removeProperty('stroke-width');
    }
  };

  const startMarching = (edgeId: EdgeId): void => {
    const path = els.edges.get(edgeId);
    if (!path) return;
    if (!marchScope) marchScope = createScope({ root: els.svgRoot });
    marchScope.add(() => {
      const baseWidth = parseFloat(path.getAttribute('stroke-width') ?? '1');
      path.style.strokeWidth = String(baseWidth * 1.5);
      path.style.strokeDasharray = `${marchPattern.dash} ${marchPattern.gap}`;
      animate(path, {
        strokeDashoffset: [0, -marchPattern.repeat],
        duration: marchPattern.duration,
        loop: true,
        ease: 'linear',
        composition: 'none',
      });
    });
  };

  const stopFocus = (): void => {
    focusScope?.revert();
    focusScope = null;
  };

  const startFocus = (activeEdgeIds: EdgeId[]): void => {
    stopFocus();
    if (activeEdgeIds.length === 0) return;
    focusScope = createScope({ root: els.svgRoot });
    focusScope.add(() => {
      for (const edgeId of activeEdgeIds) {
        const path = els.edges.get(edgeId);
        if (!path) continue;
        const totalLen =
          (path as SVGPathElement).getTotalLength?.() ??
          parseFloat(path.getAttribute('stroke-dasharray') ?? '300');
        path.style.strokeDasharray = String(totalLen);
        animate(path, {
          strokeDashoffset: [0, totalLen],
          duration: FOCUS_DURATION,
          loop: true,
          alternate: true,
          ease: 'inOutSine',
        });
      }
    });
  };

  // Reset marching on every loop boundary so old animations don't stack.
  tl.onLoop = () => resetMarching();

  return { resetMarching, startFocus, stopFocus, startMarching };
}

interface MarchPattern {
  repeat: number;
  dash: number;
  gap: number;
  duration: number;
}

/** Marching pattern derived from the median edge length. */
function computeMarchPattern(els: ResolvedElements): MarchPattern {
  const lens: number[] = [];
  for (const path of els.edges.values()) {
    const len = (path as SVGPathElement).getTotalLength?.();
    if (typeof len === 'number' && len > 0) lens.push(len);
  }
  lens.sort((a, b) => a - b);
  const median = lens[Math.floor(lens.length / 2)] ?? 100;
  const repeat = Math.max(1, Math.round(median / 8));
  const gap = Math.round((repeat * 3) / 5);
  const dash = Math.max(1, repeat - gap);
  const duration = Math.max(200, Math.round((repeat / median) * 3000));
  return { repeat, dash, gap, duration };
}
