import type { WindowLike } from 'dompurify';

export async function sanitizeSvg(svg: string): Promise<string> {
  const { JSDOM } = await import('jsdom');
  const DOMPurify = (await import('dompurify')).default;
  const window = new JSDOM('').window;
  // jsdom's DOMWindow runtime-satisfies DOMPurify's WindowLike (the subset of
  // globalThis it actually pokes at), but the structural intersection in
  // WindowLike is too deep for TS to verify automatically. Cast through
  // `unknown` to the specific WindowLike — narrower than the prior `Window`
  // cast and runtime-correct.
  const purify = DOMPurify(window as unknown as WindowLike);
  const clean = purify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
  });
  window.close();
  return clean;
}
