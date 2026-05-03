import { createTimeline, svg as animeSvg, type Timeline } from './_anime.js';
import type {
  AnimationScene,
  EdgeId,
  NodeId,
  SceneEdge,
  SceneStep,
} from '../animation/scene/types.js';
import type { ResolvedElements } from './elements.js';

const NODE_OPACITY_REST = 0.4;
const NODE_OPACITY_ACTIVE = 1;
const NODE_OPACITY_COMPLETED = 0.85;
const NODE_OPACITY_FADE_DURATION = 150;
const NODE_COMPLETE_FADE_DURATION = 200;
const SHADOW_REST = 'drop-shadow(-4px 6px 10px var(--soom-shadow-rest))';
const SHADOW_ACTIVE = 'drop-shadow(-6px 10px 16px var(--soom-shadow-active))';
const SHADOW_COMPLETED = 'drop-shadow(-4px 7px 12px var(--soom-shadow-completed))';

export interface BuiltTimeline {
  timeline: Timeline;
  drawables: Map<EdgeId, ReturnType<typeof animeSvg.createDrawable>>;
  /** Offset where step N begins (length === scene.steps.length). */
  stepOffsets: number[];
  /** Offset where step N's reveal completes (length === scene.steps.length). */
  stepEndOffsets: number[];
}

/**
 * Build the master anime.js timeline from the AnimationScene + resolved DOM.
 * Pure: takes a scene, returns a paused Timeline ready for `seek` / `play`.
 *
 * Initial state is encoded entirely via `timeline.set(..., 0)` — no boot-time
 * DOM mutation. This keeps `seek(0, true)` correct without manual reset code.
 */
export function buildTimeline(scene: AnimationScene, els: ResolvedElements): BuiltTimeline {
  const timeline = createTimeline({
    autoplay: false,
    loop: true,
    loopDelay: scene.timing.loopDelay,
    defaults: { ease: 'inOutQuad' },
  });

  const drawables = installInitialState(timeline, scene, els);

  let offset = scene.timing.idleGap;
  const stepOffsets: number[] = [];
  const stepEndOffsets: number[] = [];
  const nodeActivated = new Set<NodeId>();

  for (let i = 0; i < scene.steps.length; i++) {
    const step = scene.steps[i];
    const stepDuration = computeStepDuration(step, scene);
    timeline.label(`step-${i}`, offset);
    stepOffsets.push(offset);
    stepEndOffsets.push(offset + stepDuration + scene.timing.interStepGap);

    addStepSegments(timeline, scene, els, step, offset, stepDuration, drawables, nodeActivated);

    offset = offset + stepDuration + NODE_COMPLETE_FADE_DURATION + scene.timing.interStepGap;
  }

  // End-hold so the loop pause at the end is visible before restart.
  if (scene.timing.endHold > 0) {
    const dummy = { v: 0 };
    timeline.add(dummy, { v: 1, duration: scene.timing.endHold }, offset);
  }

  return { timeline, drawables, stepOffsets, stepEndOffsets };
}

function installInitialState(
  timeline: Timeline,
  scene: AnimationScene,
  els: ResolvedElements
): Map<EdgeId, ReturnType<typeof animeSvg.createDrawable>> {
  for (const node of els.nodes.values()) {
    timeline.set(node, { opacity: NODE_OPACITY_REST, filter: SHADOW_REST }, 0);
  }
  const drawables = new Map<EdgeId, ReturnType<typeof animeSvg.createDrawable>>();
  for (const [edgeId, path] of els.edges) {
    const drawable = animeSvg.createDrawable(path);
    drawables.set(edgeId, drawable);
    timeline.set(drawable, { draw: '0 0' }, 0);
    timeline.set(path, { opacity: 0.2 }, 0);
  }
  for (const label of els.edgeLabels.values()) {
    timeline.set(label, { opacity: 0 }, 0);
  }
  return drawables;
}

function addStepSegments(
  timeline: Timeline,
  scene: AnimationScene,
  els: ResolvedElements,
  step: SceneStep,
  offset: number,
  stepDuration: number,
  drawables: Map<EdgeId, ReturnType<typeof animeSvg.createDrawable>>,
  nodeActivated: Set<NodeId>
): void {
  const activatedInStep = new Set<NodeId>();

  for (const nid of step.activate.nodes) {
    activateNode(timeline, els, nid, offset, nodeActivated, activatedInStep);
  }

  for (const eid of step.activate.edges) {
    const edge = scene.elements.edges[eid];
    if (!edge) continue;
    revealEdge(timeline, els, eid, edge, offset, drawables);
    if (edge.target && !activatedInStep.has(edge.target)) {
      activateNode(
        timeline,
        els,
        edge.target,
        offset + edge.drawDuration,
        nodeActivated,
        activatedInStep
      );
    }
  }

  // Settle to "completed" appearance after step finishes.
  const completeOffset = offset + stepDuration + 200;
  for (const nid of activatedInStep) {
    const el = els.nodes.get(nid);
    if (!el) continue;
    timeline.add(
      el,
      {
        opacity: [NODE_OPACITY_ACTIVE, NODE_OPACITY_COMPLETED],
        duration: NODE_COMPLETE_FADE_DURATION,
      },
      completeOffset
    );
    timeline.add(
      el,
      {
        filter: [SHADOW_ACTIVE, SHADOW_COMPLETED],
        duration: NODE_COMPLETE_FADE_DURATION,
        ease: 'outQuad',
      },
      completeOffset
    );
    timeline.call(() => {
      el.classList.remove('soom-node-active');
      el.classList.add('soom-node-completed');
    }, completeOffset);
  }

  // If the step has no edges, ensure we still occupy the slot.
  if (step.activate.edges.length === 0) {
    const dummy = { v: 0 };
    timeline.add(dummy, { v: 1, duration: stepDuration }, offset);
  }
}

function activateNode(
  timeline: Timeline,
  els: ResolvedElements,
  nid: NodeId,
  offset: number,
  nodeActivated: Set<NodeId>,
  activatedInStep: Set<NodeId>
): void {
  const el = els.nodes.get(nid);
  if (!el) return;
  activatedInStep.add(nid);
  const fromOpacity = nodeActivated.has(nid) ? NODE_OPACITY_COMPLETED : NODE_OPACITY_REST;
  nodeActivated.add(nid);

  timeline.add(
    el,
    {
      opacity: [fromOpacity, NODE_OPACITY_ACTIVE],
      duration: NODE_OPACITY_FADE_DURATION,
    },
    offset
  );
  timeline.add(
    el,
    {
      filter: [SHADOW_REST, SHADOW_ACTIVE],
      duration: NODE_OPACITY_FADE_DURATION,
    },
    offset
  );
  timeline.call(() => {
    // Strip the prior step's completed class before re-activating: a node
    // that completed earlier and re-appears in this step would otherwise
    // carry both classes simultaneously (caught by playback.test.ts'
    // conflictCount assertion). The complete callback below restores
    // `soom-node-completed` at this step's end.
    el.classList.remove('soom-node-completed');
    el.classList.add('soom-node-active');
  }, offset);
}

function revealEdge(
  timeline: Timeline,
  els: ResolvedElements,
  eid: EdgeId,
  edge: SceneEdge,
  offset: number,
  drawables: Map<EdgeId, ReturnType<typeof animeSvg.createDrawable>>
): void {
  const drawable = drawables.get(eid);
  const path = els.edges.get(eid);
  if (!drawable || !path) return;

  timeline.add(
    drawable,
    { draw: ['0 0', '0 1'], duration: edge.drawDuration, ease: edge.easing },
    offset
  );
  timeline.add(path, { opacity: [0.2, 1], duration: edge.drawDuration }, offset);
  timeline.call(() => path.classList.add('soom-edge-completed'), offset + edge.drawDuration);

  const label = els.edgeLabels.get(eid);
  if (label) {
    timeline.add(label, { opacity: [0, 1], duration: 200 }, offset + edge.drawDuration);
  }
}

/** Step duration is the slowest edge reveal in the step, or 800ms default. */
function computeStepDuration(step: SceneStep, scene: AnimationScene): number {
  let max = 0;
  for (const eid of step.activate.edges) {
    const edge = scene.elements.edges[eid];
    if (edge && edge.drawDuration > max) max = edge.drawDuration;
  }
  return max || 800;
}
