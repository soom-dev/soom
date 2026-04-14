import { baseCss } from '../themes/base.js';
import { darkTheme } from '../themes/dark.js';
import { lightTheme } from '../themes/light.js';
import { buildWatermarkSvg } from '../watermark/svg.js';
import { buildWatermarkScript } from '../watermark/animation.js';
import { sanitizeSvg } from './sanitize.js';
import { buildToggleScript, buildToggleCss } from './toggle.js';
import { loadAnimeJs } from './anime-loader.js';

export type ThemeName = 'dark' | 'light';

interface AnimationData {
  sequenceJson: string;
  animationScript: string;
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
    ${baseCss}
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
