import { describe, expect, test } from 'bun:test';
import { postProcessSvg } from '../../src/render/post-process.js';
import { buildGraphFromSvg } from '../../src/render/graph-extractor.js';
import { autoSequence } from '../../src/sequencer/auto.js';
import { buildScene } from '../../src/animation/scene/build.js';

const SAMPLE_SVG = `<svg>
  <g class="nodes">
    <g class="node default" id="flowchart-A-0" data-node-id="A">
      <rect class="basic" width="80" height="40"/>
      <foreignObject><div class="nodeLabel">Start</div></foreignObject>
    </g>
    <g class="node default" id="flowchart-B-1" data-node-id="B">
      <rect class="basic" width="80" height="40"/>
      <foreignObject><div class="nodeLabel">End</div></foreignObject>
    </g>
  </g>
  <g class="edgePaths">
    <path id="L-A-B-0" d="M0,0 L100,100"/>
  </g>
</svg>`;

const SAMPLE_SOURCE = `graph TD
  A[Start] --> B[End]`;

describe('cloud pipeline (shared functions)', () => {
  test('postProcessSvg adds data-node-id attributes', () => {
    const raw = '<g class="node default" id="flowchart-MyNode-0">';
    const processed = postProcessSvg(raw, '');
    expect(processed).toContain('data-node-id="MyNode"');
  });

  test('postProcessSvg annotates subgraph depth', () => {
    const svg = '<g class="cluster" id="sub-cloud">';
    const source = 'subgraph cloud\n  A --> B\nend';
    const processed = postProcessSvg(svg, source);
    expect(processed).toContain('data-depth="0"');
  });

  test('buildGraphFromSvg extracts nodes and edges', () => {
    const graph = buildGraphFromSvg(SAMPLE_SVG, SAMPLE_SOURCE);
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.has('A')).toBe(true);
    expect(graph.nodes.has('B')).toBe(true);
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].source).toBe('A');
    expect(graph.edges[0].target).toBe('B');
  });

  test('autoSequence produces BFS ordering', () => {
    const graph = buildGraphFromSvg(SAMPLE_SVG, SAMPLE_SOURCE);
    const sequence = autoSequence(graph);
    expect(sequence.steps.length).toBe(2);
    expect(sequence.steps[0].activateNodes).toContain('A');
    expect(sequence.steps[1].activateNodes).toContain('B');
  });

  test('buildScene produces valid Scene IR', () => {
    const graph = buildGraphFromSvg(SAMPLE_SVG, SAMPLE_SOURCE);
    const sequence = autoSequence(graph);
    const measurements = new Map([['edge-0', 100]]);
    const scene = buildScene(graph, sequence, measurements, SAMPLE_SVG);

    expect(scene.version).toBe(1);
    expect(scene.diagramType).toBe('flowchart');
    expect(Object.keys(scene.elements.nodes).length).toBe(2);
    expect(Object.keys(scene.elements.edges).length).toBe(1);
    expect(scene.steps.length).toBe(2);
    expect(scene.timing.idleGap).toBeGreaterThan(0);
  });

  test('full pipeline end-to-end produces valid scene', () => {
    const svg = postProcessSvg(SAMPLE_SVG, SAMPLE_SOURCE);
    const graph = buildGraphFromSvg(svg, SAMPLE_SOURCE);
    const sequence = autoSequence(graph);
    const measurements = new Map<string, number>();
    graph.edges.forEach((e) => measurements.set(e.id, 200));
    const scene = buildScene(graph, sequence, measurements, svg);

    expect(scene.steps.length).toBeGreaterThan(0);
    expect(scene.elements.nodes['A']).toBeDefined();
    expect(scene.elements.nodes['B']).toBeDefined();
  });
});
