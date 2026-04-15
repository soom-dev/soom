import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import { renderHtml, type ThemeName } from './output/html.js';
import { generateAnimationScript } from './animation/engine.js';
import { autoSequence } from './sequencer/auto.js';
import { renderMermaidToSvg } from './render/playwright.js';
import { postProcessSvg } from './render/post-process.js';
import { buildGraphFromSvg } from './render/graph-extractor.js';
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
  const svg = postProcessSvg(rawSvg);

  const graph = buildGraphFromSvg(svg, source);
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
