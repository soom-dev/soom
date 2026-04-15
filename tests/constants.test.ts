import { describe, it, expect } from 'bun:test';
import { TIMING, Z_INDEX, LAYOUT } from '../src/constants.js';

describe('TIMING constants', () => {
  it('should have all expected timing keys', () => {
    expect(TIMING).toHaveProperty('stepDuration');
    expect(TIMING).toHaveProperty('transitionDuration');
    expect(TIMING).toHaveProperty('glowPulseDuration');
    expect(TIMING).toHaveProperty('loopDelay');
    expect(TIMING).toHaveProperty('annotationFade');
  });

  it('all timing values should be positive numbers', () => {
    for (const value of Object.values(TIMING)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('stepDuration should be 800ms', () => {
    expect(TIMING.stepDuration).toBe(800);
  });

  it('loopDelay should be longer than stepDuration', () => {
    expect(TIMING.loopDelay).toBeGreaterThan(TIMING.stepDuration);
  });

  it('annotationFade should be shorter than stepDuration', () => {
    expect(TIMING.annotationFade).toBeLessThan(TIMING.stepDuration);
  });
});

describe('Z_INDEX constants', () => {
  it('should have all expected z-index keys', () => {
    expect(Z_INDEX).toHaveProperty('watermark');
    expect(Z_INDEX).toHaveProperty('annotations');
    expect(Z_INDEX).toHaveProperty('controls');
    expect(Z_INDEX).toHaveProperty('themeToggle');
  });

  it('all z-index values should be positive', () => {
    for (const value of Object.values(Z_INDEX)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('z-indexes should be in ascending stacking order', () => {
    expect(Z_INDEX.watermark).toBeLessThan(Z_INDEX.annotations);
    expect(Z_INDEX.annotations).toBeLessThan(Z_INDEX.controls);
    expect(Z_INDEX.controls).toBeLessThan(Z_INDEX.themeToggle);
  });
});

describe('LAYOUT constants', () => {
  it('should have all expected layout keys', () => {
    expect(LAYOUT).toHaveProperty('watermarkWidth');
    expect(LAYOUT).toHaveProperty('watermarkHeight');
    expect(LAYOUT).toHaveProperty('annotationMaxWidth');
    expect(LAYOUT).toHaveProperty('annotationFontSize');
    expect(LAYOUT).toHaveProperty('toggleButtonSize');
    expect(LAYOUT).toHaveProperty('controlsHeight');
    expect(LAYOUT).toHaveProperty('controlsTouchTarget');
  });

  it('all layout values should be positive', () => {
    for (const value of Object.values(LAYOUT)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('touch targets should be at least 44px (WCAG guideline)', () => {
    expect(LAYOUT.toggleButtonSize).toBeGreaterThanOrEqual(44);
    expect(LAYOUT.controlsTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it('annotation max width should be reasonable for readability', () => {
    expect(LAYOUT.annotationMaxWidth).toBeGreaterThanOrEqual(400);
    expect(LAYOUT.annotationMaxWidth).toBeLessThanOrEqual(1000);
  });
});
