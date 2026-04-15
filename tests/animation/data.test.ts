import { describe, it, expect } from 'bun:test';
import { extractAnimationData } from '../../src/animation/data.js';
import type { AnimaGraph } from '../../src/types.js';

function makeGraph(overrides?: Partial<AnimaGraph>): AnimaGraph {
  return {
    nodes: new Map(),
    edges: [],
    subgraphs: [],
    metadata: { sourceFormat: 'mermaid', sourceText: '' },
    ...overrides,
  };
}

describe('extractAnimationData', () => {
  it('should return empty maps for an empty graph', () => {
    const result = extractAnimationData(makeGraph());
    expect(Object.keys(result.nodeLabels)).toHaveLength(0);
    expect(Object.keys(result.edgeInfo)).toHaveLength(0);
  });

  it('should extract node labels from graph nodes', () => {
    const graph = makeGraph({
      nodes: new Map([
        ['A', { id: 'A', label: 'Start', type: 'start', position: { x: 0, y: 0, width: 100, height: 40 } }],
        ['B', { id: 'B', label: 'End', type: 'end', position: { x: 0, y: 100, width: 100, height: 40 } }],
      ]),
    });
    const result = extractAnimationData(graph);
    expect(result.nodeLabels).toEqual({ A: 'Start', B: 'End' });
  });

  it('should extract edge info with source, target, and label', () => {
    const graph = makeGraph({
      edges: [
        { id: 'edge-0', source: 'A', target: 'B', label: 'yes', path: '', style: 'solid' },
        { id: 'edge-1', source: 'B', target: 'C', path: '', style: 'dashed' },
      ],
    });
    const result = extractAnimationData(graph);
    expect(result.edgeInfo['edge-0']).toEqual({ source: 'A', target: 'B', label: 'yes' });
    expect(result.edgeInfo['edge-1']).toEqual({ source: 'B', target: 'C', label: undefined });
  });

  it('should handle nodes with multiline labels', () => {
    const graph = makeGraph({
      nodes: new Map([
        ['X', { id: 'X', label: 'Line1\nLine2', type: 'process', position: { x: 0, y: 0, width: 0, height: 0 } }],
      ]),
    });
    const result = extractAnimationData(graph);
    expect(result.nodeLabels['X']).toBe('Line1\nLine2');
  });

  it('should handle a single-node graph with no edges', () => {
    const graph = makeGraph({
      nodes: new Map([
        ['solo', { id: 'solo', label: 'Alone', type: 'default', position: { x: 0, y: 0, width: 0, height: 0 } }],
      ]),
    });
    const result = extractAnimationData(graph);
    expect(result.nodeLabels).toEqual({ solo: 'Alone' });
    expect(Object.keys(result.edgeInfo)).toHaveLength(0);
  });

  it('should preserve edge IDs as keys in edgeInfo', () => {
    const graph = makeGraph({
      edges: [
        { id: 'edge-A-B', source: 'A', target: 'B', path: '', style: 'solid' },
        { id: 'edge-B-C', source: 'B', target: 'C', path: '', style: 'solid' },
      ],
    });
    const result = extractAnimationData(graph);
    expect(Object.keys(result.edgeInfo)).toEqual(['edge-A-B', 'edge-B-C']);
  });
});
