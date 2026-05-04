import { svg as animeSvg, type Timeline } from './_anime.js';
import type { AnimationScene, EdgeId } from '../animation/scene/types.js';
import type { ResolvedElements } from './elements.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PARTICLE_RADIUS = 3;
const PARTICLE_CLASS = 'soom-flow-particle';

export interface BindParticlesOptions {
  /**
   * Skip particle injection entirely when the user prefers reduced motion —
   * the moving particle is purely decorative and adds no information the
   * edge-reveal already conveys.
   */
  reducedMotion?: boolean;
}

/**
 * Restore flow particles via `svg.createMotionPath`.
 *
 * One `<circle class="soom-flow-particle">` per edge, appended to the edge
 * path's parent `<g>` so it inherits the same CTM transform. Without this,
 * particles are visually offset when paths live inside transformed groups
 * (Mermaid dagre output nests paths under a translated `<g>`).
 *
 * The particle animation runs alongside the edge `draw` segment in the
 * master timeline — same offset, same duration. createMotionPath on SVG
 * targets returns coordinate functions that anime.js treats as raw values
 * (no CTM), so by appending into the same parent we get correct visual
 * tracking. See `learnings/refactor-animejs-utilities.md`.
 */
export function bindFlowParticles(
  timeline: Timeline,
  scene: AnimationScene,
  els: ResolvedElements,
  options?: BindParticlesOptions
): void {
  if (options?.reducedMotion) return;
  for (const [edgeId, path] of els.edges) {
    const edge = scene.elements.edges[edgeId];
    if (!edge) continue;
    const offset = locateEdgeOffset(scene, edgeId);
    if (offset === null) continue;
    const particle = createParticle(path);
    const parent = path.parentElement as Element | null;
    if (!parent) continue;
    parent.appendChild(particle);
    timeline.set(particle, { opacity: 0 }, 0);
    timeline.set(particle, { opacity: 1 }, offset);
    addParticleSegment(timeline, particle, path, offset, edge.drawDuration);
    timeline.set(particle, { opacity: 0 }, offset + edge.drawDuration);
  }
}

function createParticle(refPath: SVGPathElement): SVGCircleElement {
  const owner = refPath.ownerDocument ?? document;
  const c = owner.createElementNS(SVG_NS, 'circle');
  c.setAttribute('r', String(PARTICLE_RADIUS));
  c.setAttribute('cx', '0');
  c.setAttribute('cy', '0');
  c.classList.add(PARTICLE_CLASS);
  return c;
}

function addParticleSegment(
  timeline: Timeline,
  particle: SVGCircleElement,
  path: SVGPathElement,
  offset: number,
  duration: number
): void {
  let motion: ReturnType<typeof animeSvg.createMotionPath> | null;
  try {
    motion = animeSvg.createMotionPath(path);
  } catch {
    motion = null;
  }
  if (motion) {
    timeline.add(
      particle,
      {
        translateX: motion.translateX,
        translateY: motion.translateY,
        duration,
        ease: 'linear',
      },
      offset
    );
    return;
  }
  // Fallback: getPointAtLength interpolation.
  const totalLen = path.getTotalLength?.() ?? 0;
  if (totalLen <= 0) return;
  const proxy = { t: 0 };
  timeline.add(
    proxy,
    {
      t: [0, 1],
      duration,
      ease: 'linear',
      onUpdate: () => {
        const pt = path.getPointAtLength(proxy.t * totalLen);
        particle.setAttribute('cx', String(pt.x));
        particle.setAttribute('cy', String(pt.y));
      },
    },
    offset
  );
}

function locateEdgeOffset(scene: AnimationScene, edgeId: EdgeId): number | null {
  let offset = scene.timing.idleGap;
  for (const step of scene.steps) {
    if (step.activate.edges.includes(edgeId)) return offset;
    const stepDuration = computeStepDuration(step, scene);
    offset = offset + stepDuration + 200 + scene.timing.interStepGap;
  }
  return null;
}

function computeStepDuration(step: AnimationScene['steps'][number], scene: AnimationScene): number {
  let max = 0;
  for (const eid of step.activate.edges) {
    const edge = scene.elements.edges[eid];
    if (edge && edge.drawDuration > max) max = edge.drawDuration;
  }
  return max || 800;
}
