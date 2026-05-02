import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseCss } from '../themes/base.js';
import { darkTheme } from '../themes/dark.js';
import { lightTheme } from '../themes/light.js';
import { buildWatermarkSvg } from '../watermark/svg.js';
import { buildWatermarkScript } from '../watermark/animation.js';
import { sanitizeSvg } from './sanitize.js';
import { buildToggleScript, buildToggleCss } from './toggle.js';
import { buildControlsHtml, buildControlsScript } from './controls.js';
import { loadAnimeJs } from './anime-loader.js';

function getPackageVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export type ThemeName = 'dark' | 'light';
export type RuntimeVersion = 'v1' | 'v2';

interface AnimationDataV1 {
  runtime: 'v1';
  sequenceJson: string;
  animationScript: string;
}

interface AnimationDataV2 {
  runtime: 'v2';
  sceneJson: string;
  runtimeBundle: string;
}

export type AnimationData = AnimationDataV1 | AnimationDataV2;

export async function renderHtml(
  svg: string,
  theme: ThemeName = 'dark',
  animation?: AnimationData
): Promise<string> {
  const cleanSvg = await sanitizeSvg(svg);
  const watermarkSvg = buildWatermarkSvg(getPackageVersion());
  const animeJs = await loadAnimeJs();
  const watermarkScript = buildWatermarkScript();
  const toggleScript = buildToggleScript();
  const toggleCss = buildToggleCss();
  const defaultClass = theme === 'light' ? 'soom-light' : 'soom-dark';

  const controlsHtml = buildControlsHtml();
  const controlsScript = buildControlsScript();

  const animationHtml = animation
    ? buildAnimationHtml(animation, controlsHtml, controlsScript)
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

// Anime.js UMD (above) populates `globalThis.anime` synchronously, then the
// Scene JSON sits in the DOM, then the IIFE runtime bundle exposes
// `window.bootRuntime`, then the boot script invokes it. All four are classic
// `<script>` tags so execution order matches document order. The shared
// controls script polls for `window.soomAnimation`, so the boot can settle
// after parse without a race.
function buildAnimationHtml(
  animation: AnimationData,
  controlsHtml: string,
  controlsScript: string
): string {
  if (animation.runtime === 'v1') {
    return `
  <div id="soom-annotations"></div>
  ${controlsHtml}
  <script id="soom-sequence" type="application/json">${animation.sequenceJson}</script>
  <script>${animation.animationScript}</script>
  <script>${controlsScript}</script>`;
  }
  return `
  <div id="soom-annotations"></div>
  ${controlsHtml}
  <script id="soom-scene" type="application/json">${animation.sceneJson}</script>
  <script>${animation.runtimeBundle}</script>
  <script>window.soomAnimation = bootRuntime(JSON.parse(document.getElementById('soom-scene').textContent));</script>
  <script>${controlsScript}</script>`;
}
