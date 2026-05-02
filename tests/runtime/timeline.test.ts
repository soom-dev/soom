import { describe, it, expect, beforeEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

describe('buildTimeline', () => {
  beforeEach(() => setupRuntimeEnv());

  it('produces a paused timeline with stepOffsets / stepEndOffsets matching the step count', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');

    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="node" id="flowchart-B-1"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L 100 100"/></g>
    `);
    const scene = makeFlowScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);

    expect(built.stepOffsets).toHaveLength(scene.steps.length);
    expect(built.stepEndOffsets).toHaveLength(scene.steps.length);
    expect(built.timeline.paused).toBe(true);
  });

  it('starts the first step at idleGap, not at 0', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="node" id="flowchart-B-1"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L 100 100"/></g>
    `);
    const scene = makeFlowScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    expect(built.stepOffsets[0]).toBe(scene.timing.idleGap);
  });

  it('produces a drawable per resolved edge', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="node" id="flowchart-B-1"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L 100 100"/></g>
    `);
    const scene = makeFlowScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    expect(built.drawables.size).toBe(els.edges.size);
  });

  it('handles empty scenes (no nodes, no steps) without throwing', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const svg = svgRoot(``);
    const scene = makeFlowScene({ nodes: {}, edges: {}, steps: [] });
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    expect(built.stepOffsets).toHaveLength(0);
    expect(built.timeline).toBeDefined();
  });

  it('produces a non-zero duration for a non-empty scene', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const svg = svgRoot(`<g class="node" id="flowchart-A-0"><rect/></g>`);
    const scene = makeFlowScene({
      nodes: { A: { svgId: 'flowchart-A-0', label: 'A' } },
      edges: {},
      steps: [{ id: 'step-0', activate: { nodes: ['A'], edges: [] }, parallel: false }],
    });
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    expect(built.stepEndOffsets[0]).toBeGreaterThan(built.stepOffsets[0]);
  });
});

function svgRoot(inner: string): SVGSVGElement {
  const doc = (globalThis as { document: Document }).document;
  const wrap = doc.createElement('div');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  doc.body.appendChild(wrap);
  return wrap.querySelector('svg') as unknown as SVGSVGElement;
}

function makeFlowScene(
  parts: {
    nodes?: AnimationScene['elements']['nodes'];
    edges?: AnimationScene['elements']['edges'];
    steps?: AnimationScene['steps'];
    loopDelay?: number;
  } = {}
): AnimationScene {
  const defaultNodes: AnimationScene['elements']['nodes'] = {
    A: { svgId: 'flowchart-A-0', label: 'A' },
    B: { svgId: 'flowchart-B-1', label: 'B' },
  };
  const defaultEdges: AnimationScene['elements']['edges'] = {
    'edge-0': {
      svgId: 'L_A_B_0',
      source: 'A',
      target: 'B',
      drawDuration: 700,
      easing: 'inOutQuad',
    },
  };
  const defaultSteps: AnimationScene['steps'] = [
    { id: 'step-0', activate: { nodes: ['A'], edges: ['edge-0'] }, parallel: false },
    { id: 'step-1', activate: { nodes: ['B'], edges: [] }, parallel: false },
  ];
  return {
    version: 1,
    diagramType: 'flowchart',
    elements: {
      nodes: parts.nodes ?? defaultNodes,
      edges: parts.edges ?? defaultEdges,
    },
    steps: parts.steps ?? defaultSteps,
    timing: {
      idleGap: 500,
      endHold: 1000,
      interStepGap: 399,
      loopDelay: parts.loopDelay ?? 3000,
    },
  };
}
