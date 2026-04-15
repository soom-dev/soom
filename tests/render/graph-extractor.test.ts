import { describe, it, expect } from 'bun:test';
import type {
  GraphNode,
  GraphEdge,
  AnimaGraph,
  AnimationStep,
  AnimationSequence,
} from '../../src/types.js';

describe('Graph Types', () => {
  it('should create a valid GraphNode', () => {
    const node: GraphNode = {
      id: 'A',
      label: 'Start',
      type: 'start',
      position: { x: 0, y: 0, width: 100, height: 40 },
    };
    expect(node.id).toBe('A');
    expect(node.type).toBe('start');
    expect(node.position.width).toBe(100);
  });

  it('should create a valid GraphEdge', () => {
    const edge: GraphEdge = {
      id: 'edge-0',
      source: 'A',
      target: 'B',
      path: 'M0,0 L100,100',
      style: 'solid',
    };
    expect(edge.source).toBe('A');
    expect(edge.target).toBe('B');
    expect(edge.style).toBe('solid');
  });

  it('should create a valid AnimaGraph', () => {
    const graph: AnimaGraph = {
      nodes: new Map([
        ['A', { id: 'A', label: 'Start', type: 'start', position: { x: 0, y: 0, width: 100, height: 40 } }],
        ['B', { id: 'B', label: 'End', type: 'end', position: { x: 0, y: 100, width: 100, height: 40 } }],
      ]),
      edges: [{ id: 'edge-0', source: 'A', target: 'B', path: 'M0,0 L0,100', style: 'solid' }],
      subgraphs: [],
      metadata: { sourceFormat: 'mermaid', sourceText: 'graph TD; A-->B;' },
    };
    expect(graph.nodes.size).toBe(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.metadata.sourceFormat).toBe('mermaid');
  });

  it('should create valid AnimationStep and AnimationSequence', () => {
    const step: AnimationStep = {
      id: 'step-0',
      activateNodes: ['A'],
      activateEdges: ['edge-0'],
      duration: 800,
      parallel: false,
    };
    const sequence: AnimationSequence = {
      steps: [step],
      defaultDuration: 800,
    };
    expect(sequence.steps).toHaveLength(1);
    expect(step.activateNodes).toContain('A');
  });
});
