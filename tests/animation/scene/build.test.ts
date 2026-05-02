import { describe, it, expect } from 'bun:test';
import { buildScene } from '../../../src/animation/scene/build.js';
import { autoSequence } from '../../../src/sequencer/auto.js';
import type { AnimaGraph, GraphNode, GraphEdge } from '../../../src/types.js';
import type { EdgeId } from '../../../src/animation/scene/types.js';

function node(id: string, label = id): GraphNode {
  return { id, label, type: 'default', position: { x: 0, y: 0, width: 0, height: 0 } };
}

function edge(id: string, source: string, target: string, label?: string): GraphEdge {
  const e: GraphEdge = { id, source, target, path: '', style: 'solid' };
  if (label) e.label = label;
  return e;
}

function graphFrom(nodes: GraphNode[], edges: GraphEdge[]): AnimaGraph {
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges,
    subgraphs: [],
    metadata: { sourceFormat: 'mermaid', sourceText: '' },
  };
}

describe('buildScene', () => {
  it('handles an empty graph', () => {
    const graph = graphFrom([], []);
    const sequence = autoSequence(graph);
    const scene = buildScene(graph, sequence, new Map<EdgeId, number>(), '<svg></svg>');

    expect(scene.version).toBe(1);
    expect(scene.diagramType).toBe('flowchart');
    expect(scene.elements.nodes).toEqual({});
    expect(scene.elements.edges).toEqual({});
    expect(scene.steps).toEqual([]);
    expect(scene.timing.idleGap).toBe(500);
    expect(scene.timing.loopDelay).toBe(3000);
  });

  it('builds a single-edge scene with the long-edge easing + duration heuristic', () => {
    const graph = graphFrom(
      [node('A'), node('B')],
      [edge('edge-0', 'A', 'B', 'go')],
    );
    const sequence = autoSequence(graph);
    const measurements = new Map<EdgeId, number>([['edge-0', 300]]);
    const scene = buildScene(graph, sequence, measurements, '<svg></svg>');

    expect(Object.keys(scene.elements.nodes).sort()).toEqual(['A', 'B']);
    expect(scene.elements.edges['edge-0']).toMatchObject({
      source: 'A',
      target: 'B',
      label: 'go',
      easing: 'inOutQuad',
      drawDuration: 900, // round(300 * 3) clamped to [400, 1200]
    });
    expect(scene.steps.length).toBeGreaterThan(0);
    expect(scene.steps[0].activate.nodes).toContain('A');
  });

  it('marks parallel steps when zero-in-degree nodes seed the first wave', () => {
    // Two roots A and B both lead to C — first wave activates A and B in parallel.
    const graph = graphFrom(
      [node('A'), node('B'), node('C')],
      [edge('edge-0', 'A', 'C'), edge('edge-1', 'B', 'C')],
    );
    const sequence = autoSequence(graph);
    const measurements = new Map<EdgeId, number>([
      ['edge-0', 80],
      ['edge-1', 600],
    ]);
    const scene = buildScene(graph, sequence, measurements, '<svg></svg>');

    expect(scene.steps[0].parallel).toBe(true);
    expect(scene.steps[0].activate.nodes.sort()).toEqual(['A', 'B']);

    // Short edge (<150) gets the spring easing + 700ms; long edge gets inOutQuad.
    expect(scene.elements.edges['edge-0'].easing).toBe('spring(1,80,10,0)');
    expect(scene.elements.edges['edge-0'].drawDuration).toBe(700);
    expect(scene.elements.edges['edge-1'].easing).toBe('inOutQuad');
    expect(scene.elements.edges['edge-1'].drawDuration).toBe(1200); // clamped
  });

  it('still produces a complete scene when the graph contains a cycle', () => {
    // A -> B -> C -> A. autoSequence breaks the cycle by picking the lowest
    // remaining in-degree node when no zero-in-degree nodes are left.
    const graph = graphFrom(
      [node('A'), node('B'), node('C')],
      [edge('edge-0', 'A', 'B'), edge('edge-1', 'B', 'C'), edge('edge-2', 'C', 'A')],
    );
    const sequence = autoSequence(graph);
    const measurements = new Map<EdgeId, number>([
      ['edge-0', 200],
      ['edge-1', 200],
      ['edge-2', 200],
    ]);
    const scene = buildScene(graph, sequence, measurements, '<svg></svg>');

    // Every node should land in some step.
    const activatedNodes = new Set(scene.steps.flatMap((s) => s.activate.nodes));
    expect(activatedNodes).toEqual(new Set(['A', 'B', 'C']));

    // Every edge should land in some step.
    const activatedEdges = new Set(scene.steps.flatMap((s) => s.activate.edges));
    expect(activatedEdges).toEqual(new Set(['edge-0', 'edge-1', 'edge-2']));
  });
});
