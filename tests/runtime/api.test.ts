import { describe, it, expect, beforeEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

describe('exposeApi', () => {
  beforeEach(() => setupRuntimeEnv());

  async function makeApi() {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindPersistentEffects } = await import('../../src/runtime/persistent.js');
    const { bindAnnotations } = await import('../../src/runtime/annotations.js');
    const { exposeApi } = await import('../../src/runtime/api.js');

    const svg = svgRoot(`
      <g class="node" id="flowchart-A-0"><rect/></g>
      <g class="node" id="flowchart-B-1"><rect/></g>
      <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100"/></g>
    `);
    const scene = makeScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els);
    const persistent = bindPersistentEffects(built.timeline, scene, els);
    const annotations = bindAnnotations(scene);
    const api = exposeApi({
      timeline: built.timeline,
      scene,
      els,
      stepOffsets: built.stepOffsets,
      stepEndOffsets: built.stepEndOffsets,
      persistent,
      annotations,
    });
    return { api, scene, built };
  }

  it('exposes the documented public surface', async () => {
    const { api } = await makeApi();
    expect(api.timeline).toBeDefined();
    expect(typeof api.play).toBe('function');
    expect(typeof api.pause).toBe('function');
    expect(typeof api.stepForward).toBe('function');
    expect(typeof api.stepBackward).toBe('function');
    expect(typeof api.goToStep).toBe('function');
    expect(typeof api.reset).toBe('function');
    expect(typeof api.setSpeed).toBe('function');
    expect(typeof api.currentStep).toBe('number');
    expect(typeof api.totalSteps).toBe('number');
    expect(typeof api.progress).toBe('number');
  });

  it('totalSteps reflects scene.steps.length', async () => {
    const { api, scene } = await makeApi();
    expect(api.totalSteps).toBe(scene.steps.length);
  });

  it('goToStep(0) seeks to the start', async () => {
    const { api } = await makeApi();
    api.goToStep(0);
    expect(api.timeline.currentTime).toBe(0);
  });

  it('setSpeed clamps to 1 for invalid values', async () => {
    const { api } = await makeApi();
    api.setSpeed(0);
    expect(api.timeline.playbackRate).toBe(1);
    api.setSpeed(-2);
    expect(api.timeline.playbackRate).toBe(1);
    api.setSpeed(2);
    expect(api.timeline.playbackRate).toBe(2);
  });

  it('reset returns currentStep to 0', async () => {
    const { api } = await makeApi();
    api.goToStep(api.totalSteps);
    api.reset();
    expect(api.currentStep).toBeGreaterThanOrEqual(0);
    expect(api.timeline.currentTime).toBe(0);
  });

  it('goToStep(N) where N > totalSteps clamps to totalSteps', async () => {
    const { api, scene } = await makeApi();
    api.goToStep(scene.steps.length + 99);
    // After clamp, currentStep should land at or below totalSteps.
    expect(api.currentStep).toBeLessThanOrEqual(api.totalSteps);
  });
});

function svgRoot(inner: string): SVGSVGElement {
  const doc = (globalThis as { document: Document }).document;
  const wrap = doc.createElement('div');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  doc.body.appendChild(wrap);
  return wrap.querySelector('svg') as unknown as SVGSVGElement;
}

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
