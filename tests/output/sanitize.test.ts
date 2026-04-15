import { describe, it, expect } from 'bun:test';
import { sanitizeSvg } from '../../src/output/sanitize.js';

describe('sanitizeSvg', () => {
  it('should return sanitized SVG content', async () => {
    const result = await sanitizeSvg('<svg><rect width="100" height="100"/></svg>');
    expect(result).toContain('rect');
    expect(result).toContain('width');
  });

  it('should strip script tags from SVG', async () => {
    const malicious = '<svg><script>alert("xss")</script><rect/></svg>';
    const result = await sanitizeSvg(malicious);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should strip onclick handlers', async () => {
    const malicious = '<svg><rect onclick="alert(1)" width="10"/></svg>';
    const result = await sanitizeSvg(malicious);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
  });

  it('should preserve foreignObject elements', async () => {
    const svg = '<svg><foreignObject width="100" height="50"><div>text</div></foreignObject></svg>';
    const result = await sanitizeSvg(svg);
    expect(result).toContain('foreignObject');
  });

  it('should preserve valid SVG elements and attributes', async () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
    const result = await sanitizeSvg(svg);
    expect(result).toContain('circle');
    expect(result).toContain('cx');
    expect(result).toContain('fill');
  });

  it('should handle empty SVG', async () => {
    const result = await sanitizeSvg('<svg></svg>');
    expect(result).toContain('svg');
  });

  it('should strip event handler attributes', async () => {
    const svg = '<svg><rect onmouseover="alert(1)" onload="alert(2)"/></svg>';
    const result = await sanitizeSvg(svg);
    expect(result).not.toContain('onmouseover');
    expect(result).not.toContain('onload');
  });

  it('should preserve SVG filter elements', async () => {
    const svg = '<svg><defs><filter id="blur"><feGaussianBlur stdDeviation="5"/></filter></defs></svg>';
    const result = await sanitizeSvg(svg);
    expect(result).toContain('filter');
    expect(result).toContain('feGaussianBlur');
  });

  it('should preserve path elements with d attribute', async () => {
    const svg = '<svg><path d="M0,0 L100,100" stroke="black"/></svg>';
    const result = await sanitizeSvg(svg);
    expect(result).toContain('path');
    expect(result).toContain('d=');
  });

  it('should preserve text elements', async () => {
    const svg = '<svg><text x="10" y="20">Hello</text></svg>';
    const result = await sanitizeSvg(svg);
    expect(result).toContain('text');
    expect(result).toContain('Hello');
  });
});
