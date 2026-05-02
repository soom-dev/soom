import { describe, it, expect, beforeEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

describe('resolveElements', () => {
  beforeEach(() => setupRuntimeEnv());

  it('resolves nodes by svgId and stamps data-node-id', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="node" id="flowchart-B-1"><rect/></g>
    `);
    const scene = makeScene({
      nodes: {
        A: { svgId: 'flowchart-A-0', label: 'A' },
        B: { svgId: 'flowchart-B-1', label: 'B' },
      },
      edges: {},
      steps: [],
    });
    const els = resolveElements(scene, svg);
    expect(els.nodes.size).toBe(2);
    expect(els.nodes.get('A')?.getAttribute('data-node-id')).toBe('A');
    expect(els.nodes.get('B')?.getAttribute('data-node-id')).toBe('B');
  });

  it('resolves edges via path#svgId selector and captures parent group', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const svg = svgRoot(`
      <g class="edgePaths">
        <path id="L_A_B_0" d="M0 0 L100 100"/>
      </g>
    `);
    const scene = makeScene({
      nodes: {},
      edges: {
        'edge-0': {
          svgId: 'L_A_B_0',
          source: 'A',
          target: 'B',
          drawDuration: 700,
          easing: 'inOutQuad',
        },
      },
      steps: [],
    });
    const els = resolveElements(scene, svg);
    expect(els.edges.size).toBe(1);
    expect(els.edgeGroups.get('edge-0')?.classList.contains('edgePaths')).toBe(true);
  });

  it('skips missing elements without throwing', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const svg = svgRoot(``);
    const scene = makeScene({
      nodes: { A: { svgId: 'nope', label: 'A' } },
      edges: {
        'edge-0': {
          svgId: 'L_X_Y_0',
          source: 'X',
          target: 'Y',
          drawDuration: 700,
          easing: 'inOutQuad',
        },
      },
      steps: [],
    });
    const els = resolveElements(scene, svg);
    expect(els.nodes.size).toBe(0);
    expect(els.edges.size).toBe(0);
  });

  it('resolves edge labels via data-id', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const svg = svgRoot(`
      <g class="edgePaths"><path id="L_A_B_0"/></g>
      <g class="edgeLabels">
        <g class="edgeLabel" data-id="L_A_B_0"><foreignObject>label</foreignObject></g>
      </g>
    `);
    const scene = makeScene({
      nodes: {},
      edges: {
        'edge-0': {
          svgId: 'L_A_B_0',
          source: 'A',
          target: 'B',
          labelSvgId: 'L_A_B_0',
          drawDuration: 700,
          easing: 'inOutQuad',
        },
      },
      steps: [],
    });
    const els = resolveElements(scene, svg);
    expect(els.edgeLabels.get('edge-0')?.classList.contains('edgeLabel')).toBe(true);
  });
});

function svgRoot(inner: string): SVGSVGElement {
  const doc = (globalThis as { document: Document }).document;
  const wrap = doc.createElement('div');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  doc.body.appendChild(wrap);
  return wrap.querySelector('svg') as unknown as SVGSVGElement;
}

function makeScene(parts: {
  nodes: AnimationScene['elements']['nodes'];
  edges: AnimationScene['elements']['edges'];
  steps: AnimationScene['steps'];
}): AnimationScene {
  return {
    version: 1,
    diagramType: 'flowchart',
    elements: { nodes: parts.nodes, edges: parts.edges },
    steps: parts.steps,
    timing: { idleGap: 500, endHold: 1000, interStepGap: 399, loopDelay: 3000 },
  };
}
