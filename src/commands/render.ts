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
                diagramPadding: 20,
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
