/**
 * Fixes foreignObject elements that Mermaid creates with width="0" height="0".
 *
 * In jsdom, getBBox() returns stub values so Mermaid can't measure text. The
 * foreignObject containers end up with zero dimensions, making labels invisible.
 * We estimate dimensions from the text content inside each foreignObject.
 */
export function fixForeignObjects(svg: string): string {
  return svg.replace(
    /<foreignObject\s+width="0"\s+height="0">([\s\S]*?)<\/foreignObject>/g,
    (_match, inner: string) => {
      // Extract visible text content (strip HTML tags)
      const text = inner.replace(/<[^>]*>/g, '').trim();
      const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
      const maxLineLen = Math.max(...lines.map((l: string) => l.length), 0);

      const width = Math.max(maxLineLen * 9, 60);
      const height = Math.max(lines.length * 24, 24);

      return `<foreignObject width="${width}" height="${height}">${inner}</foreignObject>`;
    }
  );
}

/**
 * Post-processes SVG output from Mermaid to fix the viewBox dimensions.
 *
 * Mermaid relies on getBBox() to compute the viewBox, but in jsdom that method
 * is polyfilled with a fixed stub ({width: 100, height: 16}). This results in
 * a tiny viewBox that clips the actual diagram. We fix it by scanning the SVG
 * DOM for real coordinate data (transforms, path commands, rect dimensions)
 * and rewriting the viewBox to encompass all content.
 */
export function fixSvgViewBox(svg: string): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function expand(x: number, y: number, w = 0, h = 0) {
    if (isFinite(x)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
    }
    if (isFinite(y)) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
    }
  }

  // 1. Scan translate(x, y) transforms
  const translateRe = /translate\(\s*([\d.eE+-]+)[,\s]+([\d.eE+-]+)\s*\)/g;
  for (const m of svg.matchAll(translateRe)) {
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    // Nodes at this position have some extent — estimate conservatively
    expand(x, y, 100, 40);
  }

  // 2. Scan path d="..." commands for coordinate extents
  const pathRe = /\bd="([^"]+)"/g;
  const coordRe = /[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g;
  for (const pm of svg.matchAll(pathRe)) {
    const d = pm[1];
    const nums = d.match(coordRe);
    if (nums && nums.length >= 2) {
      for (let i = 0; i < nums.length - 1; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        expand(x, y);
      }
    }
  }

  // 3. Scan rect elements for x, y, width, height
  const rectRe = /<rect[^>]*>/g;
  const attrRe = /\b(x|y|width|height)="([\d.]+)"/g;
  for (const rm of svg.matchAll(rectRe)) {
    const tag = rm[0];
    const attrs: Record<string, number> = {};
    for (const am of tag.matchAll(attrRe)) {
      attrs[am[1]] = parseFloat(am[2]);
    }
    if ('x' in attrs || 'y' in attrs) {
      expand(attrs.x ?? 0, attrs.y ?? 0, attrs.width ?? 0, attrs.height ?? 0);
    }
  }

  // 4. Scan circle elements for cx, cy, r
  const circleRe = /<circle[^>]*>/g;
  const circleAttrRe = /\b(cx|cy|r)="([\d.]+)"/g;
  for (const cm of svg.matchAll(circleRe)) {
    const tag = cm[0];
    const attrs: Record<string, number> = {};
    for (const am of tag.matchAll(circleAttrRe)) {
      attrs[am[1]] = parseFloat(am[2]);
    }
    if ('cx' in attrs || 'cy' in attrs) {
      const r = attrs.r ?? 0;
      expand((attrs.cx ?? 0) - r, (attrs.cy ?? 0) - r, r * 2, r * 2);
    }
  }

  // If we couldn't extract any coordinates, return unchanged
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return svg;
  }

  // 5. Add padding
  const padding = 20;
  const vbX = Math.floor(minX - padding);
  const vbY = Math.floor(minY - padding);
  const vbW = Math.ceil(maxX - minX + padding * 2);
  const vbH = Math.ceil(maxY - minY + padding * 2);

  // 6. Rewrite viewBox on the root <svg> element
  let result = svg.replace(
    /(<svg[^>]*?)viewBox="[^"]*"/,
    `$1viewBox="${vbX} ${vbY} ${vbW} ${vbH}"`
  );

  // 7. Remove the bad max-width inline style that Mermaid sets
  result = result.replace(
    /(<svg[^>]*?)style="[^"]*max-width:\s*[\d.]+px[^"]*"/,
    `$1style="max-width: 100%;"`
  );

  // 8. Set width="100%" for responsive scaling
  result = result.replace(/(<svg[^>]*?)\bwidth="[\d.]+px?"/, `$1width="100%"`);

  return result;
}
