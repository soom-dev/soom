import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { darkTheme } from '../themes/dark.js';
import { lightTheme } from '../themes/light.js';
import { buildWatermarkSvg } from '../watermark/svg.js';
import { buildWatermarkScript } from '../watermark/animation.js';

export type ThemeName = 'dark' | 'light';

async function sanitizeSvg(svg: string): Promise<string> {
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

async function loadAnimeJs(): Promise<string> {
  const require = createRequire(import.meta.url);
  const animeMain = require.resolve('animejs');
  // animeMain resolves to dist/modules/index.cjs — go up to package root
  const pkgRoot = join(dirname(animeMain), '..', '..');
  const bundlePath = join(pkgRoot, 'dist', 'bundles', 'anime.umd.min.js');
  return readFile(bundlePath, 'utf-8');
}

interface AnimationData {
  sequenceJson: string;
  animationScript: string;
}

function buildToggleScript(): string {
  return `
(function() {
  var body = document.body;
  var btn = document.querySelector('.soom-theme-toggle');
  if (!btn) return;
  var saved = localStorage.getItem('soom-theme');
  if (saved === 'light' || saved === 'dark') {
    body.classList.remove('soom-dark', 'soom-light');
    body.classList.add('soom-' + saved);
  }
  function update() {
    var isDark = body.classList.contains('soom-dark');
    btn.textContent = isDark ? '\\u2600\\uFE0F' : '\\uD83C\\uDF19';
  }
  update();
  btn.addEventListener('click', function() {
    var isDark = body.classList.contains('soom-dark');
    body.classList.remove('soom-dark', 'soom-light');
    body.classList.add(isDark ? 'soom-light' : 'soom-dark');
    localStorage.setItem('soom-theme', isDark ? 'light' : 'dark');
    update();
  });
})();`;
}

function buildToggleCss(): string {
  return `
    .soom-theme-toggle {
      position: fixed; top: 12px; right: 16px; z-index: 30;
      width: 44px; height: 44px; border: none; border-radius: 50%;
      background: rgba(128, 128, 128, 0.3); cursor: pointer;
      font-size: 20px; line-height: 44px; text-align: center;
      transition: background 200ms ease; backdrop-filter: blur(4px);
    }
    .soom-theme-toggle:hover { background: rgba(128, 128, 128, 0.5); }
  `;
}

export async function renderHtml(
  svg: string,
  theme: ThemeName = 'dark',
  animation?: AnimationData
): Promise<string> {
  const cleanSvg = await sanitizeSvg(svg);
  const watermarkSvg = buildWatermarkSvg();
  const animeJs = await loadAnimeJs();
  const watermarkScript = buildWatermarkScript();
  const toggleScript = buildToggleScript();
  const toggleCss = buildToggleCss();
  const defaultClass = theme === 'light' ? 'soom-light' : 'soom-dark';

  const animationHtml = animation
    ? `
  <div id="soom-annotations"></div>
  <script id="soom-sequence" type="application/json">${animation.sequenceJson}</script>
  <script>${animation.animationScript}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;">
  <title>Hansoom Diagram</title>
  <style>
    ${darkTheme.css}
    ${lightTheme.css}
    ${toggleCss}
  </style>
</head>
<body class="${defaultClass}">
  <button class="soom-theme-toggle" aria-label="Toggle theme" title="Toggle dark/light mode"></button>
  <div class="diagram-container">
    ${cleanSvg}
  </div>
  ${watermarkSvg}
  <script>${animeJs}</script>
  <script>${toggleScript}</script>
  <script>${watermarkScript}</script>${animationHtml}
</body>
</html>`;
}
