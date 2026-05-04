export const TIMING = {
  stepDuration: 800,
  transitionDuration: 300,
  glowPulseDuration: 1500,
  loopDelay: 3000,
  annotationFade: 200,
  // Scene IR (R1+) — emitted into AnimationScene.timing. Values mirror the
  // hard-coded literals in src/animation/runtime/timeline-builder.ts so the
  // Scene matches today's behaviour when consumed in R3.
  idleGap: 500,
  interStepGap: 399,
  endHold: 1000,
} as const;

export const Z_INDEX = {
  watermark: 10,
  annotations: 20,
  controls: 25,
  themeToggle: 30,
} as const;

export const LAYOUT = {
  watermarkWidth: 120,
  watermarkHeight: 28,
  annotationMaxWidth: 650,
  annotationFontSize: 18,
  toggleButtonSize: 44,
  controlsHeight: 48,
  controlsTouchTarget: 44,
} as const;

// Node elevation shadows. Geometry encodes depth: rest sits closest to the
// page (10px blur), active rises (16px blur, larger offset), completed
// settles back partway. Colors come through theme tokens
// (--soom-shadow-rest/active/completed) so dark and light themes can tune
// alpha independently. Edge and particle shadows use a separate visual
// language and live inline in themes/base.ts — see DESIGN.md.
export const SHADOW = {
  rest: 'drop-shadow(-4px 6px 10px var(--soom-shadow-rest))',
  active: 'drop-shadow(-6px 10px 16px var(--soom-shadow-active))',
  completed: 'drop-shadow(-4px 7px 12px var(--soom-shadow-completed))',
} as const;
