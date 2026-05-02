import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import {
  renderHtml,
  type ThemeName,
  type RuntimeVersion,
  type AnimationData,
} from './output/html.js';
import { generateAnimationScript } from './animation/engine.js';
import { buildScene } from './animation/scene/build.js';
import { measureEdgePaths } from './animation/scene/measurements.js';
import { autoSequence } from './sequencer/auto.js';
import { renderMermaidToSvg } from './render/playwright.js';
import { postProcessSvg } from './render/post-process.js';
import { buildGraphFromSvg } from './render/graph-extractor.js';
import { loadRuntimeBundle } from './output/runtime-loader.js';
import { openInBrowser } from './utils/browser.js';

interface RenderOptions {
  output?: string;
  theme?: ThemeName;
  open?: boolean;
}

// Single source of truth for the runtime selection — read once at the
// pipeline boundary so unit tests and library consumers stay env-agnostic.
function selectRuntime(): RuntimeVersion {
  const raw = process.env.HANSOOM_RUNTIME;
  if (raw === undefined || raw === '') return 'v1';
  if (raw === 'v1' || raw === 'v2') return raw;
  throw new Error(`HANSOOM_RUNTIME must be 'v1' or 'v2' (got ${JSON.stringify(raw)})`);
}

export async function renderCommand(input: string, options: RenderOptions) {
  const inputPath = resolve(input);
  const source = await readFile(inputPath, 'utf-8');

  const runtime = selectRuntime();
  const selectedTheme = options.theme ?? 'dark';
  const rawSvg = await renderMermaidToSvg(source, selectedTheme);
  const svg = postProcessSvg(rawSvg, source);

  const graph = buildGraphFromSvg(svg, source);
  const sequence = autoSequence(graph);

  const measurements = await measureEdgePaths(svg);
  const scene = buildScene(graph, sequence, measurements, svg);

  let animation: AnimationData;
  if (runtime === 'v2') {
    const runtimeBundle = await loadRuntimeBundle();
    animation = {
      runtime: 'v2',
      sceneJson: JSON.stringify(scene),
      runtimeBundle,
    };
  } else {
    animation = {
      runtime: 'v1',
      sequenceJson: JSON.stringify(sequence),
      animationScript: generateAnimationScript(sequence, graph),
    };
  }

  const html = await renderHtml(svg, selectedTheme, animation);

  const outputPath = options.output
    ? resolve(options.output)
    : join(dirname(inputPath), basename(inputPath).replace(/\.(mmd|mermaid)$/i, '.html'));

  await writeFile(outputPath, html, 'utf-8');
  console.log(`\u2713 Rendered ${basename(inputPath)} \u2192 ${basename(outputPath)}`);

  if (options.open) {
    openInBrowser(outputPath);
  }
}
