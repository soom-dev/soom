import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import { renderHtml, type ThemeName } from './output/html.js';
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

export async function renderCommand(input: string, options: RenderOptions) {
  const inputPath = resolve(input);
  const source = await readFile(inputPath, 'utf-8');

  const selectedTheme = options.theme ?? 'dark';
  const rawSvg = await renderMermaidToSvg(source, selectedTheme);
  const svg = postProcessSvg(rawSvg, source);

  const graph = buildGraphFromSvg(svg, source);
  const sequence = autoSequence(graph);

  const measurements = await measureEdgePaths(svg);
  const scene = buildScene(graph, sequence, measurements, svg);

  const runtimeBundle = await loadRuntimeBundle();
  const html = await renderHtml(svg, selectedTheme, {
    sceneJson: JSON.stringify(scene),
    runtimeBundle,
  });

  const outputPath = options.output
    ? resolve(options.output)
    : join(dirname(inputPath), basename(inputPath).replace(/\.(mmd|mermaid)$/i, '.html'));

  await writeFile(outputPath, html, 'utf-8');
  console.log(`✓ Rendered ${basename(inputPath)} → ${basename(outputPath)}`);

  if (options.open) {
    openInBrowser(outputPath);
  }
}
