import { describe, it, expect } from 'bun:test';
import { autoSequence } from '../../src/sequencer/auto.js';
import type { AnimaGraph } from '../../src/types.js';

describe('Auto Sequencer', () => {
  it('should produce a linear sequence for a simple graph', () => {
    const graph: AnimaGraph = {
      nodes: new Map([
        ['A', { id: 'A', label: 'Start', type: 'start', position: { x: 0, y: 0, width: 100, height: 40 } }],
        ['B', { id: 'B', label: 'Process', type: 'process', position: { x: 0, y: 100, width: 100, height: 40 } }],
        ['C', { id: 'C', label: 'End', type: 'end', position: { x: 0, y: 200, width: 100, height: 40 } }],
      ]),
      edges: [
        { id: 'edge-0', source: 'A', target: 'B', path: '', style: 'solid' },
        { id: 'edge-1', source: 'B', target: 'C', path: '', style: 'solid' },
      ],
      subgraphs: [],
      metadata: { sourceFormat: 'mermaid', sourceText: '' },
    };

    const sequence = autoSequence(graph);
    expect(sequence.steps.length).toBe(3);
    expect(sequence.steps[0].activateNodes).toContain('A');
    expect(sequence.steps[1].activateNodes).toContain('B');
    expect(sequence.steps[2].activateNodes).toContain('C');
  });

  it('should handle cycles without collapsing steps', () => {
    const graph: AnimaGraph = {
      nodes: new Map([
        ['A', { id: 'A', label: 'Start', type: 'start', position: { x: 0, y: 0, width: 100, height: 40 } }],
        ['B', { id: 'B', label: 'Process', type: 'process', position: { x: 0, y: 100, width: 100, height: 40 } }],
        ['C', { id: 'C', label: 'Check', type: 'decision', position: { x: 0, y: 200, width: 100, height: 40 } }],
        ['D', { id: 'D', label: 'End', type: 'end', position: { x: 0, y: 300, width: 100, height: 40 } }],
      ]),
      edges: [
        { id: 'edge-0', source: 'A', target: 'B', path: '', style: 'solid' },
        { id: 'edge-1', source: 'B', target: 'C', path: '', style: 'solid' },
        { id: 'edge-2', source: 'C', target: 'D', path: '', style: 'solid' },
        { id: 'edge-3', source: 'C', target: 'A', path: '', style: 'solid' }, // cycle back
      ],
      subgraphs: [],
      metadata: { sourceFormat: 'mermaid', sourceText: '' },
    };

    const sequence = autoSequence(graph);
    // All 4 nodes must appear — cycle should not cause node loss
    const allNodes = sequence.steps.flatMap(s => s.activateNodes);
    expect(allNodes).toContain('A');
    expect(allNodes).toContain('B');
    expect(allNodes).toContain('C');
    expect(allNodes).toContain('D');
    expect(sequence.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('should sequence disconnected components', () => {
    const graph: AnimaGraph = {
      nodes: new Map([
        ['A', { id: 'A', label: 'A', type: 'default', position: { x: 0, y: 0, width: 100, height: 40 } }],
        ['B', { id: 'B', label: 'B', type: 'default', position: { x: 0, y: 100, width: 100, height: 40 } }],
        ['X', { id: 'X', label: 'X', type: 'default', position: { x: 200, y: 0, width: 100, height: 40 } }],
        ['Y', { id: 'Y', label: 'Y', type: 'default', position: { x: 200, y: 100, width: 100, height: 40 } }],
      ]),
      edges: [
        { id: 'edge-0', source: 'A', target: 'B', path: '', style: 'solid' },
        { id: 'edge-1', source: 'X', target: 'Y', path: '', style: 'solid' },
      ],
      subgraphs: [],
      metadata: { sourceFormat: 'mermaid', sourceText: '' },
    };

    const sequence = autoSequence(graph);
    const allNodes = sequence.steps.flatMap(s => s.activateNodes);
    expect(allNodes).toContain('A');
    expect(allNodes).toContain('B');
    expect(allNodes).toContain('X');
    expect(allNodes).toContain('Y');
    // Roots from both components should appear in step 0 (parallel)
    expect(sequence.steps[0].activateNodes).toContain('A');
    expect(sequence.steps[0].activateNodes).toContain('X');
    expect(sequence.steps[0].parallel).toBe(true);
  });

  it('should handle a pure cycle (no roots)', () => {
    const graph: AnimaGraph = {
      nodes: new Map([
        ['A', { id: 'A', label: 'A', type: 'default', position: { x: 0, y: 0, width: 100, height: 40 } }],
        ['B', { id: 'B', label: 'B', type: 'default', position: { x: 0, y: 100, width: 100, height: 40 } }],
        ['C', { id: 'C', label: 'C', type: 'default', position: { x: 0, y: 200, width: 100, height: 40 } }],
      ]),
      edges: [
        { id: 'edge-0', source: 'A', target: 'B', path: '', style: 'solid' },
        { id: 'edge-1', source: 'B', target: 'C', path: '', style: 'solid' },
        { id: 'edge-2', source: 'C', target: 'A', path: '', style: 'solid' },
      ],
      subgraphs: [],
      metadata: { sourceFormat: 'mermaid', sourceText: '' },
    };

    const sequence = autoSequence(graph);
    const allNodes = sequence.steps.flatMap(s => s.activateNodes);
    expect(allNodes).toContain('A');
    expect(allNodes).toContain('B');
    expect(allNodes).toContain('C');
    expect(sequence.steps.length).toBe(3);
  });

  it('should handle branching graphs with parallel steps', () => {
    const graph: AnimaGraph = {
      nodes: new Map([
        ['A', { id: 'A', label: 'Start', type: 'start', position: { x: 0, y: 0, width: 100, height: 40 } }],
        ['B', { id: 'B', label: 'Left', type: 'default', position: { x: -100, y: 100, width: 100, height: 40 } }],
        ['C', { id: 'C', label: 'Right', type: 'default', position: { x: 100, y: 100, width: 100, height: 40 } }],
      ]),
      edges: [
        { id: 'edge-0', source: 'A', target: 'B', path: '', style: 'solid' },
        { id: 'edge-1', source: 'A', target: 'C', path: '', style: 'solid' },
      ],
      subgraphs: [],
      metadata: { sourceFormat: 'mermaid', sourceText: '' },
    };

    const sequence = autoSequence(graph);
    expect(sequence.steps.length).toBe(2);
    expect(sequence.steps[0].activateNodes).toContain('A');
    expect(sequence.steps[1].activateNodes).toContain('B');
    expect(sequence.steps[1].activateNodes).toContain('C');
    expect(sequence.steps[1].parallel).toBe(true);
  });
});
