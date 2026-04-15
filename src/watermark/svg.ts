import { HANSOOM_PATHS, HANGUL_PATHS, HANSOOM_VIEWBOX, HANGUL_VIEWBOX } from './paths.js';

export function buildWatermarkSvg(version = '0.0.0'): string {
  const enPaths = HANSOOM_PATHS.map((p) => `<path class="soom-wm-char" d="${p.d}" />`).join(
    '\n      '
  );

  const krPaths = HANGUL_PATHS.map((p) => `<path class="soom-wm-char" d="${p.d}" />`).join(
    '\n      '
  );

  const href = `https://hansoom.dev?utm_source=soom-output&utm_medium=watermark&utm_campaign=diagram&v=${encodeURIComponent(version)}`;

  return `<a href="${href}" target="_blank" rel="noopener" class="soom-watermark">
  <svg class="soom-wm-svg soom-wm-en" viewBox="${HANSOOM_VIEWBOX}" xmlns="http://www.w3.org/2000/svg">
    ${enPaths}
  </svg>
  <svg class="soom-wm-svg soom-wm-kr" viewBox="${HANGUL_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" style="display:none">
    ${krPaths}
  </svg>
</a>`;
}
