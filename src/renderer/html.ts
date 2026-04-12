import { darkTheme } from '../themes/dark.js';
import { lightTheme } from '../themes/light.js';

export type ThemeName = 'dark' | 'light';

async function sanitizeSvg(svg: string): Promise<string> {
  // Dynamic imports to avoid polluting the dompurify module cache before
  // mermaid has a chance to initialize it with the jsdom window globals.
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

export async function renderHtml(svg: string, theme: ThemeName = 'dark'): Promise<string> {
  const themeConfig = theme === 'light' ? lightTheme : darkTheme;
  const cleanSvg = await sanitizeSvg(svg);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">
  <title>Hansoom Diagram</title>
  <style>
    ${themeConfig.css}
  </style>
</head>
<body>
  <div class="diagram-container">
    ${cleanSvg}
  </div>
</body>
</html>`;
}
