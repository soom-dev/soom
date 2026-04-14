import { describe, it, expect, beforeAll } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { $ } from 'bun';
import { generateAnimationScript } from '../src/animation/engine.js';
import type { AnimationSequence, AnimaGraph } from '../src/graph/types.js';

describe('generateAnimationScript', () => {
  const graph: AnimaGraph = {
    nodes: new Map([
      ['A', { id: 'A', label: 'Start', type: 'start', position: { x: 0, y: 0, width: 0, height: 0 } }],
      ['B', { id: 'B', label: 'End', type: 'end', position: { x: 0, y: 0, width: 0, height: 0 } }],
    ]),
    edges: [{ id: 'edge-0', source: 'A', target: 'B', path: '', style: 'solid' }],
    subgraphs: [],
    metadata: { sourceFormat: 'mermaid', sourceText: '' },
  };

  const sequence: AnimationSequence = {
    steps: [
      { id: 'step-0', activateNodes: ['A'], activateEdges: ['edge-0'], duration: 800, parallel: false },
      { id: 'step-1', activateNodes: ['B'], activateEdges: [], duration: 800, parallel: false },
    ],
    defaultDuration: 800,
  };

  it('should return a non-empty script string', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script.length).toBeGreaterThan(100);
  });

  it('should contain soomAnimation API', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('soomAnimation');
    expect(script).toContain('play');
    expect(script).toContain('pause');
    expect(script).toContain('stepForward');
    expect(script).toContain('reset');
  });

  it('should contain node activation class names', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('soom-node-active');
    expect(script).toContain('soom-node-completed');
  });

  it('should embed node labels for annotations', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('Start');
    expect(script).toContain('End');
  });

  it('should use anime.js createTimeline API', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('createTimeline');
    expect(script).toContain("label('step-");
  });

  it('should expose timeline object and progress getter', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('timeline: timeline');
    expect(script).toContain('get progress');
    expect(script).toContain('timeline.progress');
  });

  it('should use playbackRate for speed control', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('playbackRate');
  });

  it('should use svg.createDrawable for edge draw', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('createDrawable');
    expect(script).toContain("draw: '0 1'");
  });

  it('should attempt svg.createMotionPath for particles', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('createMotionPath');
  });

  it('should use createAnimatable for annotation opacity', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('createAnimatable');
  });

  it('should use utils.set for initial state', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('utils.set');
  });

  it('should not contain manual getTotalLength for initial edge setup', () => {
    const script = generateAnimationScript(sequence, graph);
    // createDrawable handles this — no manual edgeLengths map
    expect(script).not.toContain('edgeLengths');
  });

  it('should use anime.animate for marching lines instead of CSS @keyframes', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('startMarchingLine');
    expect(script).not.toContain('@keyframes');
  });

  it('should have node opacity as timeline segments', () => {
    const script = generateAnimationScript(sequence, graph);
    // Node opacity animated via timeline.add with from/to values
    expect(script).toContain('opacity: [fromOpacity, 1]');
    expect(script).toContain('opacity: [1, 0.85]');
  });
});

describe('Animation integration', () => {
  beforeAll(async () => {
    await $`bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-anim-simple.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-branching.mmd -o /tmp/test-anim-branch.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-microservice.mmd -o /tmp/test-anim-micro.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-cicd.mmd -o /tmp/test-anim-cicd.html`.quiet();
  }, 120_000);

  it('should contain sequence JSON data', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<script id="soom-sequence" type="application/json">');
    const match = html.match(/<script id="soom-sequence" type="application\/json">([\s\S]*?)<\/script>/);
    expect(match).toBeTruthy();
    const seq = JSON.parse(match![1]);
    expect(seq.steps).toBeDefined();
    expect(seq.steps.length).toBeGreaterThan(0);
  });

  it('should contain annotation panel', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<div id="soom-annotations">');
  });

  it('should contain glow filter', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<filter id="soom-glow">');
  });

  it('should contain animation CSS classes', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('soom-node-active');
    expect(html).toContain('soom-node-completed');
    expect(html).toContain('soom-flow-particle');
  });

  it('should use createDrawable in rendered output', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('createDrawable');
  });

  it('should not contain @keyframes soom-march in rendered output', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).not.toContain('@keyframes soom-march');
  });

  it('should render all four examples without errors', async () => {
    for (const name of ['simple', 'branch', 'micro', 'cicd']) {
      const html = await readFile(`/tmp/test-anim-${name}.html`, 'utf-8');
      expect(html).toContain('soomAnimation');
      expect(html).toContain('soom-sequence');
      expect(html).toContain('soom-glow');
      expect(html).toContain('createTimeline');
      expect(html).toContain('createDrawable');
    }
  });

  it('should produce valid sequence JSON for all examples', async () => {
    for (const name of ['simple', 'branch', 'micro', 'cicd']) {
      const html = await readFile(`/tmp/test-anim-${name}.html`, 'utf-8');
      const match = html.match(/<script id="soom-sequence" type="application\/json">([\s\S]*?)<\/script>/);
      expect(match).toBeTruthy();
      const seq = JSON.parse(match![1]);
      expect(seq.steps.length).toBeGreaterThan(0);
      seq.steps.forEach((step: { activateNodes: string[] }) => {
        expect(step.activateNodes.length).toBeGreaterThan(0);
      });
    }
  });
});
