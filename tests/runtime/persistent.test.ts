import { describe, it, expect, beforeEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

describe('bindPersistentEffects', () => {
  beforeEach(() => setupRuntimeEnv());

  it('returns a binding object with the expected shape', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindPersistentEffects } = await import('../../src/runtime/persistent.js');

    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100"/></g>
    `);
    const scene = minimalScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    const bindings = bindPersistentEffects(built.timeline, scene, els);
    expect(typeof bindings.startMarching).toBe('function');
    expect(typeof bindings.resetMarching).toBe('function');
    expect(typeof bindings.startFocus).toBe('function');
    expect(typeof bindings.stopFocus).toBe('function');
  });

  it('startMarching sets stroke-dasharray on the target edge', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindPersistentEffects } = await import('../../src/runtime/persistent.js');

    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100" stroke-width="1"/></g>
    `);
    const scene = minimalScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    const bindings = bindPersistentEffects(built.timeline, scene, els);

    bindings.startMarching('edge-0');
    const path = els.edges.get('edge-0');
    expect(path?.style.strokeDasharray).toMatch(/^\d+ \d+$/);
  });

  it('resetMarching clears inline stroke styles after a march was applied', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindPersistentEffects } = await import('../../src/runtime/persistent.js');

    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100" stroke-width="1"/></g>
    `);
    const scene = minimalScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    const bindings = bindPersistentEffects(built.timeline, scene, els);

    bindings.startMarching('edge-0');
    bindings.resetMarching();
    const path = els.edges.get('edge-0');
    expect(path?.style.strokeDasharray).toBe('');
    expect(path?.style.strokeWidth).toBe('');
  });

  it('startFocus is a no-op for an empty active list', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindPersistentEffects } = await import('../../src/runtime/persistent.js');

    const svg = svgRoot(``);
    const scene = minimalScene({ nodes: {}, edges: {}, steps: [] });
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    const bindings = bindPersistentEffects(built.timeline, scene, els);

    expect(() => bindings.startFocus([])).not.toThrow();
    expect(() => bindings.stopFocus()).not.toThrow();
  });
});

function svgRoot(inner: string): SVGSVGElement {
  const doc = (globalThis as { document: Document }).document;
  const wrap = doc.createElement('div');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  doc.body.appendChild(wrap);
  return wrap.querySelector('svg') as unknown as SVGSVGElement;
}

function minimalScene(parts: Partial<AnimationScene['elements']> & { steps?: AnimationScene['steps'] } = {}): AnimationScene {
  return {
    version: 1,
    diagramType: 'flowchart',
    elements: {
      nodes: parts.nodes ?? { A: { svgId: 'flowchart-A-0', label: 'A' } },
      edges:
        parts.edges ??
        ({
          'edge-0': {
            svgId: 'L_A_B_0',
            source: 'A',
            target: 'B',
            drawDuration: 700,
            easing: 'inOutQuad',
          },
        } as AnimationScene['elements']['edges']),
    },
    steps:
      parts.steps ??
      ([
        { id: 'step-0', activate: { nodes: ['A'], edges: ['edge-0'] }, parallel: false },
      ] as AnimationScene['steps']),
    timing: { idleGap: 500, endHold: 1000, interStepGap: 399, loopDelay: 3000 },
  };
}
