import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { renderHtml, type ThemeName } from '../renderer/html.js';

interface RenderOptions {
  output?: string;
  theme?: ThemeName;
}

function findMermaidBundlePath(): string {
  const require = createRequire(import.meta.url);
  const mermaidMain = require.resolve('mermaid');
  // mermaid's main resolves to dist/mermaid.core.mjs; we need the browser bundle
  return join(dirname(mermaidMain), 'mermaid.min.js');
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
  const svg = await renderMermaidToSvg(source, selectedTheme);
  const html = await renderHtml(svg, selectedTheme);

  const outputPath = options.output
    ? resolve(options.output)
    : join(dirname(inputPath), basename(inputPath).replace(/\.(mmd|mermaid)$/i, '.html'));

  await writeFile(outputPath, html, 'utf-8');
  console.log(`\u2713 Rendered ${basename(inputPath)} \u2192 ${basename(outputPath)}`);
}
