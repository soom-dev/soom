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

    // Fix 2: Inject rendered SVG into DOM and measure actual label widths
    // before returning — uses real browser layout to prevent clipping.
    await page.evaluate(
      ({ svgContent }: { svgContent: string }) => {
        const container = document.getElementById('container');
        if (container) container.innerHTML = svgContent; // safe: svgContent is Mermaid-rendered SVG from same page
      },
      { svgContent: svg }
    );

    await page.evaluate(() => {
      const svgEl = document.querySelector<SVGSVGElement>('#container svg');
      if (!svgEl) return;

      const svgDOMRect = svgEl.getBoundingClientRect();
      const viewBox = svgEl.viewBox.baseVal;
      // Determine SVG user units per CSS pixel for coordinate conversion
      const vbWidth =
        viewBox.width || parseFloat(svgEl.getAttribute('width') || '0') || svgDOMRect.width;
      if (svgDOMRect.width === 0 || vbWidth === 0) return;
      const pxToSvg = vbWidth / svgDOMRect.width;

      svgEl.querySelectorAll('.node').forEach((nodeEl) => {
        const shapeEl = nodeEl.querySelector<SVGRectElement>('rect');
        const foEl = nodeEl.querySelector<SVGForeignObjectElement>('foreignObject');
        if (!foEl) return;

        // Temporarily expand foreignObject so content can render at natural width
        const origFoWidth = foEl.getAttribute('width') ?? '';
        foEl.setAttribute('width', '3000');

        const labelEl = foEl.querySelector<HTMLElement>('.nodeLabel, p, span, div');
        // Fix 2: override CSS constraints that prevent natural width measurement
        if (labelEl) {
          labelEl.style.whiteSpace = 'nowrap';
          labelEl.style.maxWidth = 'none';
        }
        const naturalWidthPx = labelEl ? labelEl.getBoundingClientRect().width : 0;

        foEl.setAttribute('width', origFoWidth);

        if (naturalWidthPx <= 0) return;

        // Add horizontal padding and convert to SVG units
        const requiredSvg = (naturalWidthPx + 32) * pxToSvg;
        const currentFoW = parseFloat(foEl.getAttribute('width') ?? '0');
        if (requiredSvg <= currentFoW) return;

        const diff = requiredSvg - currentFoW;

        // Widen rect shape if present (polygon/circle nodes skip shape resize)
        if (shapeEl) {
          const currentShapeW = parseFloat(shapeEl.getAttribute('width') ?? '0');
          if (requiredSvg > currentShapeW) {
            const shapeDiff = requiredSvg - currentShapeW;
            const currentShapeX = parseFloat(shapeEl.getAttribute('x') ?? '0');
            shapeEl.setAttribute('width', String(requiredSvg));
            shapeEl.setAttribute('x', String(currentShapeX - shapeDiff / 2));
          }
        }

        const currentFoX = parseFloat(foEl.getAttribute('x') ?? '0');
        foEl.setAttribute('width', String(requiredSvg));
        foEl.setAttribute('x', String(currentFoX - diff / 2));
      });
    });

    const fixedSvg = await page.evaluate(() => {
      const svgEl = document.querySelector('#container svg');
      return svgEl ? svgEl.outerHTML : null;
    });

    return fixedSvg ?? svg;
  } finally {
    await browser.close();
  }
}
