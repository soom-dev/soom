import type { AnimaGraph, GraphNode, GraphEdge } from '../graph/types.js';

/**
 * Build a minimal AnimaGraph from the SVG structure for the sequencer.
 * Extracts node IDs and edge source/target from Mermaid's SVG ID conventions.
 */
export function buildGraphFromSvg(svg: string, mermaidSource?: string): AnimaGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Extract node IDs from flowchart-{name}-{index} pattern
  const nodeRe = /id="[^"]*flowchart-([^"]*?)-\d+"/g;
  const seenNodes = new Set<string>();
  let m;
  while ((m = nodeRe.exec(svg)) !== null) {
    const nodeId = m[1];
    if (!seenNodes.has(nodeId)) {
      seenNodes.add(nodeId);
      // Extract label from foreignObject content near this node
      const label = nodeId; // Will be enriched below
      nodes.set(nodeId, {
        id: nodeId,
        label,
        type: 'default',
        position: { x: 0, y: 0, width: 0, height: 0 },
      });
    }
  }

  // Extract labels from nodeLabel spans
  const labelRe = /id="[^"]*flowchart-([^"]*?)-\d+"[\s\S]*?class="nodeLabel[^"]*">([^<]+)</g;
  while ((m = labelRe.exec(svg)) !== null) {
    const nodeId = m[1];
    const label = m[2].trim();
    if (nodes.has(nodeId)) {
      nodes.get(nodeId)!.label = label;
    }
  }

  // Extract edge labels from data-id attributes in edgeLabel groups
  const edgeLabelRe =
    /data-id="[^"]*L[-_]([^"_-]+)[-_]([^"_-]+)[-_]\d+"[^>]*>[\s\S]*?<foreignObject[^>]*>([\s\S]*?)<\/foreignObject>/g;
  const edgeLabelMap = new Map<string, string>();
  while ((m = edgeLabelRe.exec(svg)) !== null) {
    const key = `${m[1]}-${m[2]}`;
    const labelText = m[3].replace(/<[^>]*>/g, '').trim();
    if (labelText) edgeLabelMap.set(key, labelText);
  }

  // Extract edges from path IDs: L_Source_Target_0 or L-Source-Target-0
  const edgeRe = /id="[^"]*L[-_]([^"_-]+)[-_]([^"_-]+)[-_]\d+"/g;
  let edgeIndex = 0;
  const seenEdges = new Set<string>();
  while ((m = edgeRe.exec(svg)) !== null) {
    const key = `${m[1]}-${m[2]}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      edges.push({
        id: `edge-${edgeIndex}`,
        source: m[1],
        target: m[2],
        label: edgeLabelMap.get(key),
        path: '',
        style: 'solid',
      });
      edgeIndex++;
    }
  }

  // Override labels from mermaid source (SVG strips <br/> during serialization)
  if (mermaidSource) {
    const mmdLabelRe = /(\w+)\[(?:"([^"]+)"|([^\]]+))\]/g;
    let mm;
    while ((mm = mmdLabelRe.exec(mermaidSource)) !== null) {
      const nodeId = mm[1];
      const rawLabel = mm[2] || mm[3];
      if (rawLabel && nodes.has(nodeId)) {
        nodes.get(nodeId)!.label = rawLabel.replace(/<br\s*\/?>/gi, '\n').trim();
      }
    }
  }

  return {
    nodes,
    edges,
    subgraphs: [],
    metadata: { sourceFormat: 'mermaid', sourceText: mermaidSource || '' },
  };
}
