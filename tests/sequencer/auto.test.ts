import { describe, it, expect } from 'bun:test';
import { autoSequence } from '../../src/sequencer/auto.js';
import type { AnimaGraph } from '../../src/graph/types.js';

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
