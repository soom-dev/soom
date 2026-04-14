export const TIMING = {
  stepDuration: 800,
  transitionDuration: 300,
  glowPulseDuration: 1500,
  loopDelay: 3000,
  annotationFade: 200,
} as const;

export const Z_INDEX = {
  watermark: 10,
  annotations: 20,
  themeToggle: 30,
} as const;

export const LAYOUT = {
  watermarkWidth: 408,
  watermarkHeight: 61,
  annotationMaxWidth: 650,
  annotationFontSize: 18,
  toggleButtonSize: 44,
} as const;
