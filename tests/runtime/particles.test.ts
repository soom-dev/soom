import { describe, it, expect, beforeEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

describe('bindFlowParticles', () => {
  beforeEach(() => setupRuntimeEnv());

  it('appends one particle <circle> per resolved edge into the edge path\'s parent group', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindFlowParticles } = await import('../../src/runtime/particles.js');

    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="node" id="flowchart-B-1"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100"/></g>
    `);
    const scene = sceneWithOneEdge();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    bindFlowParticles(built.timeline, scene, els);

    const circles = svg.querySelectorAll('circle.soom-flow-particle');
    expect(circles.length).toBe(1);
    // CTM correctness: circle's parent must be the edge's parent <g>, not the SVG root.
    expect((circles[0].parentElement as Element).classList.contains('edgePaths')).toBe(true);
  });

  it('nests the particle inside a transformed parent group when the path lives there (CTM regression check)', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindFlowParticles } = await import('../../src/runtime/particles.js');

    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="node" id="flowchart-B-1"><rect/></g>
      <g class="edgePaths" transform="translate(10,10)">
        <path id="L_A_B_0" d="M0 0 L100 100"/>
      </g>
    `);
    const scene = sceneWithOneEdge();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    bindFlowParticles(built.timeline, scene, els);

    const circle = svg.querySelector('circle.soom-flow-particle');
    expect(circle).not.toBeNull();
    expect((circle!.parentElement as Element).getAttribute('transform')).toBe('translate(10,10)');
  });

  it('does nothing for scenes with no edges', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindFlowParticles } = await import('../../src/runtime/particles.js');

    const svg = svgRoot(``);
    const scene: AnimationScene = {
      version: 1,
      diagramType: 'flowchart',
      elements: { nodes: {}, edges: {} },
      steps: [],
      timing: { idleGap: 500, endHold: 1000, interStepGap: 399, loopDelay: 3000 },
    };
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    expect(() => bindFlowParticles(built.timeline, scene, els)).not.toThrow();
    expect(svg.querySelectorAll('circle.soom-flow-particle').length).toBe(0);
  });

  it('skips edges that do not appear in any step', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindFlowParticles } = await import('../../src/runtime/particles.js');

    const svg = svgRoot(`
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100"/></g>
    `);
    const scene = sceneWithOneEdge({ stepEdges: [] });
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    bindFlowParticles(built.timeline, scene, els);
    expect(svg.querySelectorAll('circle.soom-flow-particle').length).toBe(0);
  });
});

function svgRoot(inner: string): SVGSVGElement {
  const doc = (globalThis as { document: Document }).document;
  const wrap = doc.createElement('div');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  doc.body.appendChild(wrap);
  return wrap.querySelector('svg') as unknown as SVGSVGElement;
}

function sceneWithOneEdge(parts: { stepEdges?: string[] } = {}): AnimationScene {
  return {
    version: 1,
    diagramType: 'flowchart',
    elements: {
      nodes: {
        A: { svgId: 'flowchart-A-0', label: 'A' },
        B: { svgId: 'flowchart-B-1', label: 'B' },
      },
      edges: {
        'edge-0': {
          svgId: 'L_A_B_0',
          source: 'A',
          target: 'B',
          drawDuration: 700,
          easing: 'inOutQuad',
        },
      },
    },
    steps: [
      {
        id: 'step-0',
        activate: { nodes: ['A'], edges: parts.stepEdges ?? ['edge-0'] },
        parallel: false,
      },
    ],
    timing: { idleGap: 500, endHold: 1000, interStepGap: 399, loopDelay: 3000 },
  };
}
