import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { renderHtml, type ThemeName } from '../renderer/html.js';
import { generateAnimationScript } from '../animation/engine.js';
import { autoSequence } from '../sequencer/auto.js';
import type { AnimaGraph, GraphNode, GraphEdge } from '../graph/types.js';

interface RenderOptions {
  output?: string;
  theme?: ThemeName;
  open?: boolean;
}

function openInBrowser(filePath: string) {
  const cmds: Record<string, string> = {
    darwin: 'open',
    linux: 'xdg-open',
    win32: 'start',
  };
  const cmd = cmds[process.platform];
  if (cmd) {
    execSync(`${cmd} "${filePath}"`, { stdio: 'ignore' });
  }
}

function findMermaidBundlePath(): string {
  const require = createRequire(import.meta.url);
  const mermaidMain = require.resolve('mermaid');
  return join(dirname(mermaidMain), 'mermaid.min.js');
}

interface NodeBounds {
  cx: number;
  cy: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  isDiamond?: boolean;
}

/**
 * Get the connection point for a specific side of a node.
 * For rectangles: center of the side.
 * For diamonds: the corner point on that side.
 */
function sideCenterPoint(
  side: 'left' | 'right' | 'top' | 'bottom',
  b: NodeBounds
): { x: number; y: number } {
  if (b.isDiamond) {
    // Diamond corners: top/bottom at cx, left/right at cy
    switch (side) {
      case 'left':
        return { x: b.left, y: b.cy };
      case 'right':
        return { x: b.right, y: b.cy };
      case 'top':
        return { x: b.cx, y: b.top };
      case 'bottom':
        return { x: b.cx, y: b.bottom };
    }
  }
  // Rectangle: center of each side
  switch (side) {
    case 'left':
      return { x: b.left, y: b.cy };
    case 'right':
      return { x: b.right, y: b.cy };
    case 'top':
      return { x: b.cx, y: b.top };
    case 'bottom':
      return { x: b.cx, y: b.bottom };
  }
}

/**
 * Snap all edge endpoints to the center of their connecting node's boundary side.
 *
 * Algorithm:
 * 1. Parse node positions and rect dimensions to compute exact boundary rectangles
 * 2. For each edge path, identify source and target nodes from the edge ID
 * 3. Determine which side of each node the edge connects to (from the path geometry)
 * 4. Snap the start point to the source side's center midpoint
 * 5. Snap the end point to the target side's center midpoint
 * 6. Adjust the adjacent path segment to maintain orthogonal routing
 */
function centerEdgeEndpoints(svg: string): string {
  // Step 1: Build node boundary map
  const bounds: Record<string, NodeBounds> = {};

  // Match node groups to extract translate + rect dimensions
  const nodeGroupRe =
    /<g[^>]*class="[^"]*\bnode\b[^"]*"[^>]*id="[^"]*flowchart-(?:elk-)?([A-Za-z][A-Za-z0-9]*)-\d+"[^>]*transform="translate\(\s*([\d.]+)[,\s]+([\d.]+)\s*\)"[^>]*>([\s\S]*?)<\/g>\s*<\/g>/g;
  let gm;
  while ((gm = nodeGroupRe.exec(svg)) !== null) {
    const name = gm[1];
    const cx = parseFloat(gm[2]);
    const cy = parseFloat(gm[3]);
    const inner = gm[4];
    // Extract rect with dimensions; for non-rect shapes (database cylinders etc.)
    // estimate from foreignObject or use a default size
    const rectMatch = inner.match(/<rect[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"/);
    let w = rectMatch ? parseFloat(rectMatch[1]) : 0;
    let h = rectMatch ? parseFloat(rectMatch[2]) : 0;
    if (w === 0 || h === 0) {
      // Try foreignObject dimensions
      const foMatch = inner.match(/<foreignObject[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"/);
      if (foMatch) {
        w = parseFloat(foMatch[1]) + 20; // add padding
        h = parseFloat(foMatch[2]) + 20;
      } else {
        w = 120; // reasonable default for unmeasured nodes
        h = 54;
      }
    }
    // Detect diamond (polygon) shapes — compute bounds from polygon points
    const polyMatch = inner.match(/<polygon[^>]*\bpoints="([^"]+)"/);
    if (polyMatch) {
      const nums = polyMatch[1]
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      // Polygon points are relative to the node's translate origin
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (let i = 0; i < nums.length - 1; i += 2) {
        minX = Math.min(minX, nums[i]);
        maxX = Math.max(maxX, nums[i]);
        minY = Math.min(minY, nums[i + 1]);
        maxY = Math.max(maxY, nums[i + 1]);
      }
      // Also account for polygon's own transform if present
      const polyTr = inner.match(
        /<polygon[^>]*transform="translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/
      );
      const ptx = polyTr ? parseFloat(polyTr[1]) : 0;
      const pty = polyTr ? parseFloat(polyTr[2]) : 0;
      // Recalculate bounds from polygon extents
      bounds[name] = {
        cx: cx + ptx + (minX + maxX) / 2,
        cy: cy + pty + (minY + maxY) / 2,
        left: cx + ptx + minX,
        right: cx + ptx + maxX,
        top: cy + pty + minY,
        bottom: cy + pty + maxY,
        isDiamond: true,
      };
      continue;
    }

    bounds[name] = {
      cx,
      cy,
      left: cx - w / 2,
      right: cx + w / 2,
      top: cy - h / 2,
      bottom: cy + h / 2,
    };
  }

  // Step 2-6: Rewrite each edge path
  return svg.replace(/<path\b[^>]*>/g, (pathTag) => {
    // Extract source and target from edge ID
    const edgeIdMatch = pathTag.match(/L_([A-Za-z][A-Za-z0-9]*)_([A-Za-z][A-Za-z0-9]*)_\d+/);
    if (!edgeIdMatch) return pathTag;
    const srcName = edgeIdMatch[1];
    const tgtName = edgeIdMatch[2];
    const srcBounds = bounds[srcName];
    const tgtBounds = bounds[tgtName];
    if (!srcBounds || !tgtBounds) return pathTag;

    return pathTag.replace(/d="([^"]*)"/, (_m, d: string) => {
      // Parse all coordinates from the path
      const parts = d.match(/[ML]\s*[\d.]+,[\d.]+/g);
      if (!parts || parts.length < 2) return `d="${d}"`;

      const coords = parts.map((p) => {
        const nums = p.match(/[\d.]+/g)!.map(Number);
        return { cmd: p[0], x: nums[0], y: nums[1] };
      });

      // Use overall edge direction (start→end) to determine connecting sides.
      // Elk routes edges with small jogs at the ends which mislead segment-level detection.
      const first = coords[0];
      const last = coords[coords.length - 1];
      const overallDx = last.x - first.x;
      const overallDy = last.y - first.y;

      // Determine connecting sides. For diamonds, use the quadrant of the
      // overall direction to pick the correct corner (diamonds have 4 corners
      // aligned to cardinal directions). For rectangles, use the dominant axis.
      function pickSide(
        dx: number,
        dy: number,
        isDeparture: boolean,
        isDiamond: boolean
      ): 'left' | 'right' | 'top' | 'bottom' {
        if (isDiamond) {
          // For diamonds: if there's meaningful lateral movement, use left/right corner.
          // Otherwise use top/bottom.
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          if (absDx > absDy * 0.3) {
            // Significant lateral component — use left or right corner
            return dx > 0 ? (isDeparture ? 'right' : 'left') : isDeparture ? 'left' : 'right';
          }
          // Mainly vertical — use top or bottom corner
          return dy > 0 ? (isDeparture ? 'bottom' : 'top') : isDeparture ? 'top' : 'bottom';
        }
        // Rectangle: use dominant axis
        if (Math.abs(dx) >= Math.abs(dy)) {
          return dx > 0 ? (isDeparture ? 'right' : 'left') : isDeparture ? 'left' : 'right';
        }
        return dy > 0 ? (isDeparture ? 'bottom' : 'top') : isDeparture ? 'top' : 'bottom';
      }

      const srcSide = pickSide(overallDx, overallDy, true, !!srcBounds.isDiamond);
      const tgtSide = pickSide(overallDx, overallDy, false, !!tgtBounds.isDiamond);

      const srcCenter = sideCenterPoint(srcSide, srcBounds);
      const tgtCenter = sideCenterPoint(tgtSide, tgtBounds);

      // Snap start point
      coords[0].x = srcCenter.x;
      coords[0].y = srcCenter.y;
      // Snap the second point to maintain orthogonal routing
      if (coords.length > 1) {
        if (srcSide === 'left' || srcSide === 'right') {
          // Horizontal departure — second point keeps its x, gets centered y
          coords[1].y = srcCenter.y;
        } else {
          // Vertical departure — second point keeps its y, gets centered x
          coords[1].x = srcCenter.x;
        }
      }

      // Snap end point
      coords[coords.length - 1].x = tgtCenter.x;
      coords[coords.length - 1].y = tgtCenter.y;
      // Snap the penultimate point to maintain orthogonal routing
      if (coords.length > 2) {
        const pen = coords[coords.length - 2];
        if (tgtSide === 'left' || tgtSide === 'right') {
          // Horizontal arrival — penultimate gets centered y
          pen.y = tgtCenter.y;
        } else {
          // Vertical arrival — penultimate gets centered x
          pen.x = tgtCenter.x;
        }
      }

      // Rebuild the path string
      const newD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join('');
      return `d="${newD}"`;
    });
  });
}

/**
 * Post-process the SVG string to add animation-related attributes and defs.
 */
function postProcessSvg(svg: string): string {
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

  // Snap edge endpoints to the center of the node's boundary side.
  // Elk spreads multiple ports along a side — we want them all at the midpoint.
  result = centerEdgeEndpoints(result);

  return result;
}

/**
 * Build a minimal AnimaGraph from the SVG structure for the sequencer.
 * Extracts node IDs and edge source/target from Mermaid's SVG ID conventions.
 */
function buildGraphFromSvg(svg: string): AnimaGraph {
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
        path: '',
        style: 'solid',
      });
      edgeIndex++;
    }
  }

  return {
    nodes,
    edges,
    subgraphs: [],
    metadata: { sourceFormat: 'mermaid', sourceText: '' },
  };
}

async function renderMermaidToSvg(source: string, theme: ThemeName): Promise<string> {
  const { chromium } = await import('playwright');
  const mermaidPath = findMermaidBundlePath();
  const mermaidJs = await readFile(mermaidPath, 'utf-8');

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    await page.setContent('<!DOCTYPE html><html><body><div id="container"></div></body></html>');
    await page.addScriptTag({ content: mermaidJs });

    const svg = await page.evaluate(
      ({ source, mermaidTheme }) => {
        return new Promise<string>((resolve, reject) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const m = (window as any).mermaid;
            m.initialize({
              startOnLoad: false,
              theme: mermaidTheme,
              securityLevel: 'loose',
              flowchart: {
                curve: 'stepAfter',
                diagramPadding: 20,
                defaultRenderer: 'elk',
              },
              elk: {
                mergeEdges: true,
                nodePlacementStrategy: 'SIMPLE',
                'elk.portConstraints': 'FIXED_SIDE',
                'elk.portAlignment.default': 'CENTER',
              },
            });
            m.render('soom-render', source)
              .then(({ svg }: { svg: string }) => resolve(svg))
              .catch((err: Error) => reject(err.message));
          } catch (err) {
            reject(err instanceof Error ? err.message : String(err));
          }
        });
      },
      { source, mermaidTheme: theme === 'dark' ? 'dark' : 'default' }
    );

    return svg;
  } finally {
    await browser.close();
  }
}

export async function renderCommand(input: string, options: RenderOptions) {
  const inputPath = resolve(input);
  const source = await readFile(inputPath, 'utf-8');

  const selectedTheme = options.theme ?? 'dark';
  const rawSvg = await renderMermaidToSvg(source, selectedTheme);
  const svg = postProcessSvg(rawSvg);

  // Build graph from SVG and generate animation
  const graph = buildGraphFromSvg(svg);
  const sequence = autoSequence(graph);
  const animationScript = generateAnimationScript(sequence, graph);

  const html = await renderHtml(svg, selectedTheme, {
    sequenceJson: JSON.stringify(sequence),
    animationScript,
  });

  const outputPath = options.output
    ? resolve(options.output)
    : join(dirname(inputPath), basename(inputPath).replace(/\.(mmd|mermaid)$/i, '.html'));

  await writeFile(outputPath, html, 'utf-8');
  console.log(`\u2713 Rendered ${basename(inputPath)} \u2192 ${basename(outputPath)}`);

  if (options.open) {
    openInBrowser(outputPath);
  }
}
