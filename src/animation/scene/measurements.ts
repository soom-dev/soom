import type { EdgeId } from './types.js';

/**
 * Measure SVG path lengths for every edge in a rendered Mermaid SVG.
 *
 * Launches a separate Playwright Chromium session rather than reusing the
 * one inside `renderMermaidToSvg`. The renderer self-contains its browser
 * lifecycle (`launch` → use → `close`) and lifting that into the pipeline
 * to share the page would require restructuring two modules. The cost of a
 * second launch (~1s) is acceptable for R1; R3 may revisit if cold-start
 * budget tightens.
 *
 * Edge IDs are assigned in the iteration order of `<g class="edgePaths"> path[id]`
 * elements, which matches how `render/graph-extractor.ts` iterates path IDs
 * in the SVG string. Both produce `edge-0`, `edge-1`, ... in the same order
 * because Mermaid emits path elements in document order and the regex in
 * graph-extractor walks the string left-to-right.
 */
export async function measureEdgePaths(svg: string): Promise<Map<EdgeId, number>> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<!DOCTYPE html><html><body>${svg}</body></html>`);

    const lengths = await page.evaluate(() => {
      const out: number[] = [];
      const paths = document.querySelectorAll<SVGPathElement>('g.edgePaths path[id]');
      paths.forEach((p) => {
        try {
          out.push(p.getTotalLength());
        } catch {
          out.push(0);
        }
      });
      return out;
    });

    const map = new Map<EdgeId, number>();
    lengths.forEach((len, idx) => {
      map.set(`edge-${idx}`, len);
    });
    return map;
  } finally {
    await browser.close();
  }
}
