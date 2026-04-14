import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { renderHtml, type ThemeName } from '../renderer/html.js';
import { generateAnimationScript } from '../animation/engine.js';
import { autoSequence } from '../sequencer/auto.js';
import { renderMermaidToSvg } from '../browser/playwright.js';
import { postProcessSvg } from '../svg/post-process.js';
import { buildGraphFromSvg } from '../svg/graph-extractor.js';

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
