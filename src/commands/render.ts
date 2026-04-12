import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import { renderHtml, type ThemeName } from '../renderer/html.js';

interface RenderOptions {
  output?: string;
  theme?: ThemeName;
}

function patchJsdomForSvg(window: Record<string, unknown>) {
  // jsdom doesn't implement SVG layout methods that mermaid needs.
  // Polyfill getBBox, getComputedTextLength, etc. with sensible defaults.
  const proto = (window as { SVGElement?: { prototype: Record<string, unknown> } }).SVGElement
    ?.prototype;
  if (proto) {
    if (!proto.getBBox) {
      proto.getBBox = function () {
        return { x: 0, y: 0, width: 100, height: 16 };
      };
    }
    if (!proto.getComputedTextLength) {
      proto.getComputedTextLength = function (this: { textContent?: string }) {
        return (this.textContent?.length ?? 0) * 8;
      };
    }
  }

  const textProto = (window as { SVGTextElement?: { prototype: Record<string, unknown> } })
    .SVGTextElement?.prototype;
  if (textProto) {
    if (!textProto.getBBox) {
      textProto.getBBox = function () {
        return { x: 0, y: 0, width: 100, height: 16 };
      };
    }
    if (!textProto.getComputedTextLength) {
      textProto.getComputedTextLength = function (this: { textContent?: string }) {
        return (this.textContent?.length ?? 0) * 8;
      };
    }
  }

  // Patch createElementNS to ensure SVG elements have getBBox
  const origCreateElementNS = (
    window as { document?: { createElementNS?: (...args: unknown[]) => unknown } }
  ).document?.createElementNS;
  if (origCreateElementNS) {
    (
      window as { document: { createElementNS: (...args: unknown[]) => unknown } }
    ).document.createElementNS = function (...args: unknown[]) {
      const el = origCreateElementNS.apply(this, args) as Record<string, unknown>;
      if (!el.getBBox) {
        el.getBBox = function () {
          return { x: 0, y: 0, width: 100, height: 16 };
        };
      }
      if (!el.getComputedTextLength) {
        el.getComputedTextLength = function () {
          return ((el as { textContent?: string }).textContent?.length ?? 0) * 8;
        };
      }
      return el;
    };
  }
}

async function renderMermaidToSvg(source: string): Promise<string> {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>',
    { pretendToBeVisual: true }
  );

  const { window } = dom;

  // Set up browser globals before mermaid import
  (globalThis as Record<string, unknown>).window = window;
  (globalThis as Record<string, unknown>).document = window.document;
  (globalThis as Record<string, unknown>).navigator = window.navigator;
  (globalThis as Record<string, unknown>).self = window;
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: () => void) =>
    setTimeout(cb, 0);
  (globalThis as Record<string, unknown>).cancelAnimationFrame = clearTimeout;

  // Polyfill SVG layout methods that jsdom doesn't implement
  patchJsdomForSvg(window as unknown as Record<string, unknown>);

  try {
    const mermaid = (await import('mermaid')).default;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    await mermaid.parse(source);
    const { svg } = await mermaid.render('soom-render', source);
    return svg;
  } finally {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).navigator;
    delete (globalThis as Record<string, unknown>).self;
    delete (globalThis as Record<string, unknown>).requestAnimationFrame;
    delete (globalThis as Record<string, unknown>).cancelAnimationFrame;
    dom.window.close();
  }
}

export async function renderCommand(input: string, options: RenderOptions) {
  const inputPath = resolve(input);
  const source = await readFile(inputPath, 'utf-8');

  const svg = await renderMermaidToSvg(source);
  const html = renderHtml(svg, options.theme ?? 'dark');

  const outputPath = options.output
    ? resolve(options.output)
    : join(dirname(inputPath), basename(inputPath).replace(/\.(mmd|mermaid)$/i, '.html'));

  await writeFile(outputPath, html, 'utf-8');
  console.log(`\u2713 Rendered ${basename(inputPath)} \u2192 ${basename(outputPath)}`);
}
