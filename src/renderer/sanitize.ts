export async function sanitizeSvg(svg: string): Promise<string> {
  const { JSDOM } = await import('jsdom');
  const DOMPurify = (await import('dompurify')).default;
  const window = new JSDOM('').window;
  const purify = DOMPurify(window as unknown as Window);
  const clean = purify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
  });
  window.close();
  return clean;
}
