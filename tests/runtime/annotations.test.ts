import { describe, it, expect, beforeEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

describe('bindAnnotations', () => {
  beforeEach(() => setupRuntimeEnv(`<div id="soom-annotations"></div>`));

  it('returns no-op bindings when the panel is missing', async () => {
    // setupRuntimeEnv ran in beforeEach with the panel. Tear it down by
    // removing the element so bindAnnotations sees a panel-less DOM.
    document.getElementById('soom-annotations')?.remove();
    const { bindAnnotations } = await import('../../src/runtime/annotations.js');
    const scene = sceneFor();
    const ann = bindAnnotations(scene);
    expect(() => ann.setStep(scene.steps[0])).not.toThrow();
    expect(() => ann.clear()).not.toThrow();
  });

  it('writes one line per activated edge', async () => {
    const { bindAnnotations } = await import('../../src/runtime/annotations.js');
    const scene = sceneFor();
    const ann = bindAnnotations(scene);
    ann.setStep(scene.steps[0]); // step-0 has 1 edge
    const panel = document.getElementById('soom-annotations');
    expect(panel?.querySelectorAll('div').length ?? 0).toBeGreaterThanOrEqual(1);
    expect(panel?.textContent).toContain('A');
    expect(panel?.textContent).toContain('B');
  });

  it('falls back to node labels when the step has no edges', async () => {
    const { bindAnnotations } = await import('../../src/runtime/annotations.js');
    const scene = sceneFor();
    const ann = bindAnnotations(scene);
    ann.setStep(scene.steps[1]); // step-1 has no edges, only node B
    const panel = document.getElementById('soom-annotations');
    expect(panel?.textContent).toContain('B');
  });

  it('includes a "Simultaneously:" header when parallel and >1 line', async () => {
    const { bindAnnotations } = await import('../../src/runtime/annotations.js');
    const scene = sceneFor({
      steps: [
        {
          id: 'step-0',
          activate: { nodes: ['A', 'B'], edges: ['edge-0', 'edge-1'] },
          parallel: true,
        },
      ],
    });
    const ann = bindAnnotations(scene);
    ann.setStep(scene.steps[0]);
    const panel = document.getElementById('soom-annotations');
    expect(panel?.textContent).toContain('Simultaneously');
  });

  it('clear() empties the panel', async () => {
    const { bindAnnotations } = await import('../../src/runtime/annotations.js');
    const scene = sceneFor();
    const ann = bindAnnotations(scene);
    ann.setStep(scene.steps[0]);
    ann.clear();
    const panel = document.getElementById('soom-annotations');
    expect(panel?.children.length).toBe(0);
  });
});

function sceneFor(parts: { steps?: AnimationScene['steps'] } = {}): AnimationScene {
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
        'edge-1': {
          svgId: 'L_A_B_1',
          source: 'A',
          target: 'B',
          drawDuration: 700,
          easing: 'inOutQuad',
        },
      },
    },
    steps:
      parts.steps ??
      ([
        { id: 'step-0', activate: { nodes: ['A'], edges: ['edge-0'] }, parallel: false },
        { id: 'step-1', activate: { nodes: ['B'], edges: [] }, parallel: false },
      ] as AnimationScene['steps']),
    timing: { idleGap: 500, endHold: 1000, interStepGap: 399, loopDelay: 3000 },
  };
}
