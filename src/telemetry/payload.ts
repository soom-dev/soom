import type { AnimaGraph } from '../types.js';

export interface TelemetryPayload {
  version: string;
  os: string;
  nodeCount: number;
  edgeCount: number;
  hasSubgraphs: boolean;
  theme: string;
  usedOpen: boolean;
  renderTimeMs: number;
  diagramType: string;
  ts: string;
}

function detectDiagramType(source: string): string {
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('%%')) continue;
    const match = line.match(/^([A-Za-z]+)/);
    return match ? match[1].toLowerCase() : 'unknown';
  }
  return 'unknown';
}

export function buildPayload(
  source: string,
  graph: AnimaGraph,
  opts: {
    version: string;
    theme: string;
    usedOpen: boolean;
    renderTimeMs: number;
  }
): TelemetryPayload {
  return {
    version: opts.version,
    os: process.platform,
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.length,
    hasSubgraphs: /^\s*subgraph\b/m.test(source),
    theme: opts.theme,
    usedOpen: opts.usedOpen,
    renderTimeMs: opts.renderTimeMs,
    diagramType: detectDiagramType(source),
    ts: new Date().toISOString(),
  };
}
