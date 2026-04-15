import type { AnimaGraph, GraphNode, GraphEdge } from '../graph/types.js';

/**
 * Parse a Mermaid edge SVG ID (e.g. "L-NODE_1A-NODE_2A-0") into source/target
 * using known node IDs to handle IDs that contain the delimiter characters.
 */
function parseEdgeId(
  rawId: string,
  knownNodeIds: string[]
): { source: string; target: string } | null {
  // Find the "L-" or "L_" edge-pattern delimiter (not an 'L' inside a node name)
  const lIdx = rawId.search(/L[-_]/);
  if (lIdx < 0) return null;
  const body = rawId.slice(lIdx + 1); // e.g. "-NODE_1A-NODE_2A-0" or "_NODE_1A_NODE_2A_0"
  if (body.length < 2) return null;
  const delim = body[0]; // '-' or '_'
  const rest = body.slice(1); // "NODE_1A-NODE_2A-0"

  // Try each known node ID as source — match from the start of rest
  for (const src of knownNodeIds) {
    if (!rest.startsWith(src)) continue;
    const afterSrc = rest.slice(src.length);
    if (afterSrc.length < 2 || afterSrc[0] !== delim) continue;
    const remaining = afterSrc.slice(1); // "NODE_2A-0"
    // Try each known node ID as target
    for (const tgt of knownNodeIds) {
      if (!remaining.startsWith(tgt)) continue;
      const afterTgt = remaining.slice(tgt.length);
      // Must end with delimiter + digits
      if (afterTgt.length >= 2 && afterTgt[0] === delim && /^\d+$/.test(afterTgt.slice(1))) {
        return { source: src, target: tgt };
      }
    }
  }
  return null;
}

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
  // Uses known node IDs to parse the data-id (same underscore/hyphen ambiguity)
  const edgeLabelGroupRe =
    /data-id="([^"]*L[-_].+?[-_]\d+)"[^>]*>[\s\S]*?<foreignObject[^>]*>([\s\S]*?)<\/foreignObject>/g;
  const edgeLabelMap = new Map<string, string>();
  const knownForLabels = Array.from(seenNodes);
  while ((m = edgeLabelGroupRe.exec(svg)) !== null) {
    const parsed = parseEdgeId(m[1], knownForLabels);
    if (!parsed) continue;
    const key = `${parsed.source}-${parsed.target}`;
    const labelText = m[2].replace(/<[^>]*>/g, '').trim();
    if (labelText) edgeLabelMap.set(key, labelText);
  }

  // Extract edges from path IDs: L_Source_Target_0 or L-Source-Target-0
  // Node IDs may contain underscores/hyphens (e.g. NODE_1A), so we use known
  // node IDs to disambiguate the delimiter from ID-internal characters.
  const edgeIdRe = /id="([^"]*L[-_].+?[-_]\d+)"/g;
  let edgeIndex = 0;
  const seenEdges = new Set<string>();
  const knownNodeIds = Array.from(seenNodes);
  while ((m = edgeIdRe.exec(svg)) !== null) {
    const rawId = m[1];
    const parsed = parseEdgeId(rawId, knownNodeIds);
    if (!parsed) continue;
    const key = `${parsed.source}-${parsed.target}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      edges.push({
        id: `edge-${edgeIndex}`,
        source: parsed.source,
        target: parsed.target,
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
