/**
 * Post-process the SVG string to add animation-related attributes and defs.
 */
export function postProcessSvg(svg: string): string {
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

  return result;
}
