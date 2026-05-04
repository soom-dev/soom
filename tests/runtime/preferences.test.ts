import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { setupRuntimeEnv } from './setup.js';
import type { AnimationScene } from '../../src/animation/scene/types.js';

/**
 * Coverage for the `prefers-reduced-motion` boot path.
 *
 * The runtime calls `window.matchMedia('(prefers-reduced-motion: reduce)')`
 * once at boot and threads the result through to `buildTimeline`,
 * `bindPersistentEffects`, and `bindFlowParticles`. These tests stub
 * `matchMedia` after `setupRuntimeEnv()` so each test can flip the signal.
 */
describe('prefers-reduced-motion runtime path', () => {
  let originalMatchMedia: ((query: string) => MediaQueryList) | undefined;

  beforeEach(() => {
    setupRuntimeEnv(`
      <div class="diagram-container">
        <svg xmlns="http://www.w3.org/2000/svg">
          <g class="node" id="flowchart-A-0"><rect/></g>
          <g class="node" id="flowchart-B-1"><rect/></g>
          <g class="edgePaths"><path id="L_A_B_0" d="M0 0 L100 100" stroke-width="1"/></g>
        </svg>
      </div>
      <div id="soom-annotations"></div>
    `);
    const win = (globalThis as { window: Window & { matchMedia?: (q: string) => MediaQueryList } })
      .window;
    originalMatchMedia = win.matchMedia;
  });

  afterEach(() => {
    const win = (globalThis as { window: Window & { matchMedia?: (q: string) => MediaQueryList } })
      .window;
    if (originalMatchMedia) win.matchMedia = originalMatchMedia;
  });

  it('detects matchMedia(...).matches = true', async () => {
    stubMatchMedia(true);
    const { prefersReducedMotion } = await import('../../src/runtime/preferences.js');
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia is unavailable', async () => {
    const win = (globalThis as { window: Window & { matchMedia?: (q: string) => MediaQueryList } })
      .window;
    win.matchMedia = undefined as unknown as (q: string) => MediaQueryList;
    const { prefersReducedMotion } = await import('../../src/runtime/preferences.js');
    expect(prefersReducedMotion()).toBe(false);
  });

  it('boots the runtime paused even when reduced motion is set', async () => {
    stubMatchMedia(true);
    const { bootRuntime } = await import('../../src/runtime/index.js');
    const api = bootRuntime(JSON.stringify(makeScene()));
    expect(api.timeline.paused).toBe(true);
    expect(typeof api.play).toBe('function');
  });

  it('collapses long edge drawDuration to ~150ms when reduced motion is set', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const svg = document.querySelector('.diagram-container svg') as unknown as SVGSVGElement;
    const scene = makeScene();
    // Force a long drawDuration so the collapse is observable.
    scene.elements.edges['edge-0'].drawDuration = 1200;
    const els = resolveElements(scene, svg);
    const reduced = buildTimeline(scene, els, { reducedMotion: true });
    const normal = buildTimeline(scene, els, { reducedMotion: false });

    // Step 0 ends well before the normal-motion build does. The exact end
    // offset includes idleGap + interStepGap + completeFade contributions
    // (those are unchanged), but the *delta* between reduced and normal
    // must match the collapse of (1200 - 150) draw + (200 - 150) completeFade.
    expect(reduced.stepEndOffsets[0]).toBeLessThan(normal.stepEndOffsets[0]);
    expect(normal.stepEndOffsets[0] - reduced.stepEndOffsets[0]).toBeGreaterThanOrEqual(900);
  });

  it('makes startMarching a no-op when reduced motion is set', async () => {
    const { resolveElements } = await import('../../src/runtime/elements.js');
    const { buildTimeline } = await import('../../src/runtime/timeline.js');
    const { bindPersistentEffects } = await import('../../src/runtime/persistent.js');
    const svg = document.querySelector('.diagram-container svg') as unknown as SVGSVGElement;
    const scene = makeScene();
    const els = resolveElements(scene, svg);
    const built = buildTimeline(scene, els, { reducedMotion: true });
    const bindings = bindPersistentEffects(built.timeline, scene, els, { reducedMotion: true });

    bindings.startMarching('edge-0');
    const path = els.edges.get('edge-0');
    // No createScope was opened, no inline stroke styles set.
    expect(path?.style.strokeDasharray).toBe('');
    expect(path?.style.strokeWidth).toBe('');

    bindings.startFocus(['edge-0']);
    expect(path?.style.strokeDasharray).toBe('');
  });

  it('skips flow particles entirely when reduced motion is set', async () => {
    stubMatchMedia(true);
    const { bootRuntime } = await import('../../src/runtime/index.js');
    bootRuntime(JSON.stringify(makeScene()));
    const particles = document.querySelectorAll('.soom-flow-particle');
    expect(particles.length).toBe(0);
  });

  it('still renders particles when reduced motion is NOT set (control)', async () => {
    stubMatchMedia(false);
    const { bootRuntime } = await import('../../src/runtime/index.js');
    bootRuntime(JSON.stringify(makeScene()));
    const particles = document.querySelectorAll('.soom-flow-particle');
    expect(particles.length).toBeGreaterThan(0);
  });
});

function stubMatchMedia(matches: boolean): void {
  const win = (globalThis as { window: Window & { matchMedia?: (q: string) => MediaQueryList } })
    .window;
  const fakeMql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
  win.matchMedia = (_q: string): MediaQueryList => fakeMql;
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
