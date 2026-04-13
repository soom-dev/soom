import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { darkTheme } from '../themes/dark.js';
import { lightTheme } from '../themes/light.js';
import { HANSOOM_PATHS, HANGUL_PATHS, HANSOOM_VIEWBOX, HANGUL_VIEWBOX } from './watermark-paths.js';

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

function buildWatermarkSvg(): string {
  const enPaths = HANSOOM_PATHS.map((p) => `<path class="soom-wm-char" d="${p.d}" />`).join(
    '\n      '
  );

  const krPaths = HANGUL_PATHS.map((p) => `<path class="soom-wm-char" d="${p.d}" />`).join(
    '\n      '
  );

  return `<a href="https://hansoom.dev" target="_blank" rel="noopener" class="soom-watermark">
  <svg class="soom-wm-svg soom-wm-en" viewBox="${HANSOOM_VIEWBOX}" xmlns="http://www.w3.org/2000/svg">
    ${enPaths}
  </svg>
  <svg class="soom-wm-svg soom-wm-kr" viewBox="${HANGUL_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" style="display:none">
    ${krPaths}
  </svg>
</a>`;
}

function buildWatermarkScript(): string {
  return `
document.addEventListener('DOMContentLoaded', function() {
  var enSvg = document.querySelector('.soom-wm-en');
  var krSvg = document.querySelector('.soom-wm-kr');
  var enChars = enSvg.querySelectorAll('.soom-wm-char');
  var krChars = krSvg.querySelectorAll('.soom-wm-char');

  function drawGroup(chars, svgEl, viewBox, speed, onDone) {
    svgEl.setAttribute('viewBox', viewBox);
    svgEl.style.display = '';
    var drawDur = Math.round(2000 / speed);
    var eraseDur = Math.round(1500 / speed);
    var staggerMs = Math.round(100 / speed);
    var holdMs = Math.round(1000 / speed);
    var drawables = anime.svg.createDrawable(chars);
    anime.animate(drawables, {
      draw: '0 1',
      ease: 'inOutQuad',
      duration: drawDur,
      delay: anime.stagger(staggerMs),
      onComplete: function() {
        setTimeout(function() {
          var drawables2 = anime.svg.createDrawable(chars);
          anime.animate(drawables2, {
            draw: ['0 1', '1 1'],
            ease: 'inOutQuad',
            duration: eraseDur,
            delay: anime.stagger(staggerMs),
            onComplete: function() {
              svgEl.style.display = 'none';
              setTimeout(onDone, 500);
            }
          });
        }, holdMs);
      }
    });
  }

  var pulseAnim = null;
  var isHovered = false;
  var strokeColor = '';

  function startPulse() {
    pulseAnim = anime.animate(enSvg, {
      filter: [
        'drop-shadow(0 0 4px ' + strokeColor + ')',
        'drop-shadow(0 0 28px ' + strokeColor + ')',
      ],
      opacity: [1, 0.5],
      duration: 1500,
      ease: 'inOutSine',
      loop: true,
      alternate: true,
    });
  }

  function startGlowPulse() {
    enSvg.style.display = '';
    strokeColor = getComputedStyle(enChars[0]).stroke || '#00d4ff';
    var drawables = anime.svg.createDrawable(enChars);

    var glowStarted = false;
    anime.animate(drawables, {
      draw: '0 1',
      ease: 'inOutQuad',
      duration: 2000,
      delay: anime.stagger(100),
      onRender: function(anim) {
        // At 90% progress, begin the glow crossfade into the pulse
        if (!glowStarted && anim.currentTime > 1800) {
          glowStarted = true;
          anime.animate(enChars, {
            fill: strokeColor,
            fillOpacity: [0, 0.15],
            duration: 1200,
            ease: 'out(3)',
          });
          anime.animate(enSvg, {
            filter: ['drop-shadow(0 0 0px ' + strokeColor + ')', 'drop-shadow(0 0 16px ' + strokeColor + ')'],
            duration: 1200,
            ease: 'out(3)',
          });
        }
      },
      onComplete: function() {
        startPulse();
      },
    });
  }

  // Hover: fast transition to peak brightness, fill characters fully L-to-R
  enSvg.parentElement.addEventListener('mouseenter', function() {
    if (!strokeColor || isHovered) return;
    isHovered = true;
    if (pulseAnim) { pulseAnim.pause(); }
    // Fast transition to peak glow (not instant)
    anime.animate(enSvg, {
      filter: 'drop-shadow(0 0 28px ' + strokeColor + ')',
      opacity: 1,
      duration: 500,
      ease: 'out(2)',
    });
    // Fill characters fully, left-to-right stagger
    anime.animate(enChars, {
      fill: strokeColor,
      fillOpacity: 1,
      duration: 600,
      delay: anime.stagger(60),
      ease: 'inOutQuad',
    });
  });

  enSvg.parentElement.addEventListener('mouseleave', function() {
    if (!isHovered) return;
    isHovered = false;
    // Fade fill back to outline level
    anime.animate(enChars, {
      fillOpacity: 0.15,
      duration: 600,
      ease: 'inOutQuad',
      onComplete: function() {
        // Restart the pulse fresh after fill fades
        if (!isHovered) { startPulse(); }
      },
    });
  });

  // Sequence: draw EN → erase → draw KR (slow) → erase → final EN draw with glow
  drawGroup(enChars, enSvg, '${HANSOOM_VIEWBOX}', 1, function() {
    drawGroup(krChars, krSvg, '${HANGUL_VIEWBOX}', 0.5, startGlowPulse);
  });
});`;
}

async function loadAnimeJs(): Promise<string> {
  const require = createRequire(import.meta.url);
  const animeMain = require.resolve('animejs');
  // animeMain resolves to dist/modules/index.cjs — go up to package root
  const pkgRoot = join(dirname(animeMain), '..', '..');
  const bundlePath = join(pkgRoot, 'dist', 'bundles', 'anime.umd.min.js');
  return readFile(bundlePath, 'utf-8');
}

export async function renderHtml(svg: string, theme: ThemeName = 'dark'): Promise<string> {
  const themeConfig = theme === 'light' ? lightTheme : darkTheme;
  const cleanSvg = await sanitizeSvg(svg);
  const watermarkSvg = buildWatermarkSvg();
  const animeJs = await loadAnimeJs();
  const watermarkScript = buildWatermarkScript();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;">
  <title>Hansoom Diagram</title>
  <style>
    ${themeConfig.css}
  </style>
</head>
<body>
  <div class="diagram-container">
    ${cleanSvg}
  </div>
  ${watermarkSvg}
  <script>${animeJs}</script>
  <script>${watermarkScript}</script>
</body>
</html>`;
}
