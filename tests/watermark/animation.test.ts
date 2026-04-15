import { describe, it, expect } from 'bun:test';
import { buildWatermarkScript } from '../../src/watermark/animation.js';

describe('buildWatermarkScript', () => {
  const script = buildWatermarkScript();

  it('should return a non-empty string', () => {
    expect(script.length).toBeGreaterThan(0);
  });

  it('should wait for DOMContentLoaded', () => {
    expect(script).toContain("addEventListener('DOMContentLoaded'");
  });

  it('should query EN and KR SVG elements', () => {
    expect(script).toContain(".querySelector('.soom-wm-en')");
    expect(script).toContain(".querySelector('.soom-wm-kr')");
  });

  it('should query character paths', () => {
    expect(script).toContain(".querySelectorAll('.soom-wm-char')");
  });

  it('should define drawGroup function for draw/erase sequence', () => {
    expect(script).toContain('function drawGroup(chars, svgEl, viewBox, speed, onDone)');
  });

  it('should use anime.svg.createDrawable for SVG draw animation', () => {
    expect(script).toContain('anime.svg.createDrawable');
  });

  it('should animate draw property from 0 to 1', () => {
    expect(script).toContain("draw: '0 1'");
  });

  it('should erase by animating draw from 0,1 to 1,1', () => {
    expect(script).toContain("draw: ['0 1', '1 1']");
  });

  it('should define startPulse function with glow animation', () => {
    expect(script).toContain('function startPulse()');
    expect(script).toContain('drop-shadow');
    expect(script).toContain('loop: true');
    expect(script).toContain('alternate: true');
  });

  it('should define startGlowPulse for final EN draw with glow', () => {
    expect(script).toContain('function startGlowPulse()');
    expect(script).toContain('fillOpacity');
  });

  it('should handle mouseenter hover effect', () => {
    expect(script).toContain("addEventListener('mouseenter'");
    expect(script).toContain('isHovered');
    expect(script).toContain('fillOpacity: 1');
  });

  it('should handle mouseleave effect', () => {
    expect(script).toContain("addEventListener('mouseleave'");
    expect(script).toContain('fillOpacity: 0.15');
  });

  it('should sequence EN draw → erase → KR draw → erase → glow', () => {
    expect(script).toContain('drawGroup(enChars');
    expect(script).toContain('drawGroup(krChars');
    expect(script).toContain('startGlowPulse');
  });

  it('should use speed parameter for duration scaling', () => {
    expect(script).toContain('2000 / speed');
    expect(script).toContain('1500 / speed');
    expect(script).toContain('100 / speed');
  });

  it('should interpolate viewBox constants', () => {
    expect(script).toContain('0 0 243 58');
    expect(script).toContain('0 0 89 58');
  });

  it('should pause pulseAnim on hover', () => {
    expect(script).toContain('pulseAnim.pause()');
  });
});
