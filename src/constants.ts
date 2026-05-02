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
  watermarkWidth: 408,
  watermarkHeight: 61,
  annotationMaxWidth: 650,
  annotationFontSize: 18,
  toggleButtonSize: 44,
  controlsHeight: 48,
  controlsTouchTarget: 44,
} as const;
