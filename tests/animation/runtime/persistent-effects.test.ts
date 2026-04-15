import { describe, it, expect } from 'bun:test';
import { buildPersistentEffectsJs } from '../../../src/animation/runtime/persistent-effects.js';

describe('buildPersistentEffectsJs', () => {
  const js = buildPersistentEffectsJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should declare glow, march, and focus animation arrays', () => {
    expect(js).toContain('var glowAnimations = []');
    expect(js).toContain('var marchAnimations = []');
    expect(js).toContain('var focusLoops = []');
    expect(js).toContain('var focusParticles = []');
  });

  it('should define stopFocusLoops function', () => {
    expect(js).toContain('function stopFocusLoops()');
  });

  it('should revert focus loops and remove particles in stopFocusLoops', () => {
    expect(js).toContain('focusLoops.forEach');
    expect(js).toContain('a.revert()');
    expect(js).toContain('focusParticles.forEach');
    expect(js).toContain('el.parentNode.removeChild(el)');
  });

  it('should define resetPersistentEffects function', () => {
    expect(js).toContain('function resetPersistentEffects()');
  });

  it('should revert all animation types in reset', () => {
    expect(js).toContain('glowAnimations.forEach');
    expect(js).toContain('marchAnimations.forEach');
  });

  it('should remove active/completed classes on reset', () => {
    expect(js).toContain('soom-node-active');
    expect(js).toContain('soom-node-completed');
    expect(js).toContain('soom-edge-completed');
  });

  it('should clear annotation element on reset', () => {
    expect(js).toContain('annotAnim');
    expect(js).toContain('annotEl.firstChild');
  });

  it('should define startFocusLoops function', () => {
    expect(js).toContain('function startFocusLoops()');
  });

  it('should filter edges by edgeTimingMap in startFocusLoops', () => {
    expect(js).toContain('edgeTimingMap[eid]');
    expect(js).toContain('timing.offset');
    expect(js).toContain('timing.duration');
  });

  it('should call setPauseAnnotation with active edges on pause', () => {
    expect(js).toContain('setPauseAnnotation(activeEdgeIds)');
  });

  it('should define startGlowPulse function with drop-shadow filter', () => {
    expect(js).toContain('function startGlowPulse(nid)');
    expect(js).toContain('drop-shadow');
    expect(js).toContain('loop: true');
    expect(js).toContain('alternate: true');
  });

  it('should define startMarchingLine function', () => {
    expect(js).toContain('function startMarchingLine(pathEl)');
    expect(js).toContain('strokeDashoffset');
    expect(js).toContain("ease: 'linear'");
  });

  it('should increase stroke width for marching lines', () => {
    expect(js).toContain('baseWidth * 1.5');
    expect(js).toContain('strokeWidth');
  });

  it('should use composition none for marching line animation', () => {
    expect(js).toContain("composition: 'none'");
  });
});
