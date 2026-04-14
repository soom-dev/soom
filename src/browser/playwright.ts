import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import type { ThemeName } from '../renderer/html.js';

function findMermaidBundlePath(): string {
  const require = createRequire(import.meta.url);
  const mermaidMain = require.resolve('mermaid');
  return join(dirname(mermaidMain), 'mermaid.min.js');
}

export async function renderMermaidToSvg(source: string, theme: ThemeName): Promise<string> {
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
