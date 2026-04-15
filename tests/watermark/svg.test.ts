import { describe, it, expect } from 'bun:test';
import { buildWatermarkSvg } from '../../src/watermark/svg.js';

describe('buildWatermarkSvg', () => {
  const svg = buildWatermarkSvg();

  it('should return a non-empty string', () => {
    expect(svg.length).toBeGreaterThan(0);
  });

  it('should link to hansoom.dev with UTM params', () => {
    expect(svg).toContain('href="https://hansoom.dev?utm_source=soom-output');
  });

  it('should open link in new tab', () => {
    expect(svg).toContain('target="_blank"');
    expect(svg).toContain('rel="noopener"');
  });

  it('should have soom-watermark class on anchor', () => {
    expect(svg).toContain('class="soom-watermark"');
  });

  it('should contain English SVG with soom-wm-en class', () => {
    expect(svg).toContain('class="soom-wm-svg soom-wm-en"');
  });

  it('should contain Korean SVG with soom-wm-kr class', () => {
    expect(svg).toContain('class="soom-wm-svg soom-wm-kr"');
  });

  it('should hide Korean SVG initially', () => {
    expect(svg).toContain('style="display:none"');
  });

  it('should include path elements with soom-wm-char class', () => {
    expect(svg).toContain('class="soom-wm-char"');
  });

  it('should include correct viewBox for English SVG', () => {
    expect(svg).toContain('viewBox="0 0 243 58"');
  });

  it('should include correct viewBox for Korean SVG', () => {
    expect(svg).toContain('viewBox="0 0 89 58"');
  });

  it('should include SVG xmlns attribute', () => {
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should contain path d attributes from HANSOOM_PATHS', () => {
    expect(svg).toContain('d="M12.53');
  });

  it('should contain path d attributes from HANGUL_PATHS', () => {
    expect(svg).toContain('d="M13.54');
  });
});
