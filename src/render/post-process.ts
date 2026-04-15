/**
 * Post-process the SVG string to add animation-related attributes and defs.
 */
export function postProcessSvg(svg: string, mermaidSource?: string): string {
  let result = svg;

  // Inject glow filter into <defs> (or create <defs> if none)
  const glowFilter = `<filter id="soom-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>`;
  if (result.includes('<defs>')) {
    result = result.replace('<defs>', `<defs>${glowFilter}`);
  } else {
    result = result.replace(/<svg([^>]*)>/, `<svg$1><defs>${glowFilter}</defs>`);
  }

  // Add data-node-id to .node elements
  result = result.replace(
    /(<g[^>]*class="[^"]*\bnode\b[^"]*"[^>]*id=")([^"]*flowchart-)([^"]*?)(-\d+)(")/g,
    '$1$2$3$4$5 data-node-id="$3"'
  );

  // Annotate cluster elements with nesting depth from mermaid source
  if (mermaidSource) {
    const depthMap = parseSubgraphDepths(mermaidSource);
    for (const [name, depth] of depthMap) {
      // Mermaid cluster IDs end with the subgraph name (e.g. id="soom-render-cloud")
      const clusterRe = new RegExp(
        `(<g[^>]*class="[^"]*\\bcluster\\b[^"]*"[^>]*id="[^"]*-${escapeRegex(name)}")`,
        'g'
      );
      result = result.replace(clusterRe, `$1 data-depth="${depth}"`);
    }
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse mermaid source to determine subgraph nesting depth.
 * Returns a map of subgraph name → depth (0 = top-level, 1 = nested, etc.)
 */
function parseSubgraphDepths(source: string): Map<string, number> {
  const depths = new Map<string, number>();
  let currentDepth = 0;

  for (const line of source.split('\n')) {
    const trimmed = line.trim();

    // Match: subgraph name["label"] or subgraph name
    const subgraphMatch = trimmed.match(/^subgraph\s+(\S+)/i);
    if (subgraphMatch) {
      const name = subgraphMatch[1].replace(/\[.*/, '').replace(/["']/g, '');
      depths.set(name, currentDepth);
      currentDepth++;
      continue;
    }

    if (/^\s*end\s*$/i.test(trimmed)) {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return depths;
}
