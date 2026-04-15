import type { AnimaGraph } from '../types.js';

export interface AnimationData {
  nodeLabels: Record<string, string>;
  edgeInfo: Record<string, { source: string; target: string; label?: string }>;
}

export function extractAnimationData(graph: AnimaGraph): AnimationData {
  const nodeLabels: Record<string, string> = {};
  for (const [id, node] of graph.nodes) {
    nodeLabels[id] = node.label;
  }

  const edgeInfo: Record<string, { source: string; target: string; label?: string }> = {};
  for (const edge of graph.edges) {
    edgeInfo[edge.id] = {
      source: edge.source,
      target: edge.target,
      label: edge.label,
    };
  }

  return { nodeLabels, edgeInfo };
}
