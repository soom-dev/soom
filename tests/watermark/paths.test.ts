import { describe, it, expect } from 'bun:test';
import { HANSOOM_PATHS, HANGUL_PATHS, HANSOOM_VIEWBOX, HANGUL_VIEWBOX } from '../../src/watermark/paths.js';

describe('HANSOOM_PATHS', () => {
  it('should contain 7 characters spelling "hansoom"', () => {
    expect(HANSOOM_PATHS).toHaveLength(7);
    const word = HANSOOM_PATHS.map((p) => p.char).join('');
    expect(word).toBe('hansoom');
  });

  it('should have valid path data for each character', () => {
    for (const p of HANSOOM_PATHS) {
      expect(p.d).toBeTruthy();
      expect(p.d.startsWith('M')).toBe(true);
      expect(p.d.length).toBeGreaterThan(10);
    }
  });

  it('should have positive width for each character', () => {
    for (const p of HANSOOM_PATHS) {
      expect(p.width).toBeGreaterThan(0);
    }
  });

  it('each path entry should have char, d, and width properties', () => {
    for (const p of HANSOOM_PATHS) {
      expect(p).toHaveProperty('char');
      expect(p).toHaveProperty('d');
      expect(p).toHaveProperty('width');
    }
  });
});

describe('HANGUL_PATHS', () => {
  it('should contain 2 Korean characters', () => {
    expect(HANGUL_PATHS).toHaveLength(2);
  });

  it('should have valid char values', () => {
    expect(HANGUL_PATHS[0].char).toBe('한');
    expect(HANGUL_PATHS[1].char).toBe('숨');
  });

  it('should have valid path data for each character', () => {
    for (const p of HANGUL_PATHS) {
      expect(p.d).toBeTruthy();
      expect(p.d.startsWith('M')).toBe(true);
      expect(p.d.length).toBeGreaterThan(10);
    }
  });

  it('should have positive width for each character', () => {
    for (const p of HANGUL_PATHS) {
      expect(p.width).toBeGreaterThan(0);
    }
  });
});

describe('ViewBox constants', () => {
  it('HANSOOM_VIEWBOX should be a valid viewBox string', () => {
    const parts = HANSOOM_VIEWBOX.split(' ');
    expect(parts).toHaveLength(4);
    parts.forEach((p) => expect(Number(p)).not.toBeNaN());
  });

  it('HANGUL_VIEWBOX should be a valid viewBox string', () => {
    const parts = HANGUL_VIEWBOX.split(' ');
    expect(parts).toHaveLength(4);
    parts.forEach((p) => expect(Number(p)).not.toBeNaN());
  });

  it('HANSOOM_VIEWBOX should be wider than HANGUL_VIEWBOX', () => {
    const hansoomWidth = Number(HANSOOM_VIEWBOX.split(' ')[2]);
    const hangulWidth = Number(HANGUL_VIEWBOX.split(' ')[2]);
    expect(hansoomWidth).toBeGreaterThan(hangulWidth);
  });
});
