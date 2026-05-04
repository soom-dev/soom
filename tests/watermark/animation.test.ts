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

  it('should query the EN SVG element', () => {
    expect(script).toContain(".querySelector('.soom-wm-en')");
  });

  it('should query character paths', () => {
    expect(script).toContain(".querySelectorAll('.soom-wm-char')");
  });

  it('should use anime.svg.createDrawable for SVG draw animation', () => {
    expect(script).toContain('anime.svg.createDrawable');
  });

  it('should animate draw property from 0 to 1', () => {
    expect(script).toContain("draw: '0 1'");
  });

  it('should stagger character draw timing', () => {
    expect(script).toContain('anime.stagger(');
  });

  it('settles after the first reveal — no erase, no looping pulse, no KR sequence', () => {
    expect(script).not.toContain("draw: ['0 1', '1 1']");
    expect(script).not.toContain('loop: true');
    expect(script).not.toContain('alternate: true');
    expect(script).not.toContain('soom-wm-kr');
    expect(script).not.toContain('drawGroup');
    expect(script).not.toContain('startPulse');
    expect(script).not.toContain('startGlowPulse');
  });

  it('does not bind hover handlers — opacity hover is in CSS', () => {
    expect(script).not.toContain("addEventListener('mouseenter'");
    expect(script).not.toContain("addEventListener('mouseleave'");
  });

  it('guards against missing DOM nodes or anime.js global', () => {
    expect(script).toContain('if (!enSvg) return');
    expect(script).toContain('window.anime');
  });
});
