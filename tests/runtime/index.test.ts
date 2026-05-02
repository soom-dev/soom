import { describe, it, expect, beforeEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

describe('bootRuntime (entry)', () => {
  beforeEach(() =>
    setupRuntimeEnv(`
      <div class="diagram-container">
        <svg xmlns="http://www.w3.org/2000/svg">
          <g class="node" id="flowchart-A-0"><rect/></g>
          <g class="node" id="flowchart-B-1"><rect/></g>
          <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100"/></g>
        </svg>
      </div>
      <div id="soom-annotations"></div>
    `)
  );

  it('boots end-to-end and returns an API of the documented shape', async () => {
    const { bootRuntime } = await import('../../src/runtime/index.js');
    const scene = makeScene();
    const api = bootRuntime(JSON.stringify(scene));

    expect(api.totalSteps).toBe(scene.steps.length);
    expect(typeof api.play).toBe('function');
    expect(typeof api.pause).toBe('function');
    expect(api.timeline).toBeDefined();
  });

  it('throws a clear error when the SVG container is missing', async () => {
    document.querySelector('.diagram-container')?.remove();
    const { bootRuntime } = await import('../../src/runtime/index.js');
    expect(() => bootRuntime(JSON.stringify(makeScene()))).toThrow(/SVG diagram container/);
  });
});

function makeScene(): AnimationScene {
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
      { id: 'step-0', activate: { nodes: ['A'], edges: ['edge-0'] }, parallel: false },
      { id: 'step-1', activate: { nodes: ['B'], edges: [] }, parallel: false },
    ],
    timing: { idleGap: 500, endHold: 1000, interStepGap: 399, loopDelay: 3000 },
  };
}
