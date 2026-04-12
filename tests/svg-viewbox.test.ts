import { describe, it, expect } from 'bun:test';
import { fixSvgViewBox } from '../src/renderer/svg-viewbox.js';

describe('fixSvgViewBox', () => {
  it('should rewrite viewBox to encompass translate transforms', () => {
    const svg = `<svg viewBox="-8 -8 116 32" style="max-width: 116px;" width="116px">
      <g transform="translate(50, 50)"><rect width="80" height="30"/></g>
      <g transform="translate(300, 100)"><rect width="80" height="30"/></g>
    </svg>`;
    const result = fixSvgViewBox(svg);
    const vbMatch = result.match(/viewBox="([^"]+)"/);
    expect(vbMatch).toBeTruthy();
    const [x, y, w, h] = vbMatch![1].split(' ').map(Number);
    // Should encompass from ~30 to ~400 in x and ~30 to ~150 in y (with padding)
    expect(w).toBeGreaterThan(200);
    expect(h).toBeGreaterThan(80);
    expect(x).toBeLessThanOrEqual(30);
    expect(y).toBeLessThanOrEqual(30);
  });

  it('should remove bad max-width and set responsive width', () => {
    const svg = `<svg viewBox="-8 -8 116 32" style="max-width: 116px;" width="116px">
      <g transform="translate(500, 50)"><text>Node</text></g>
    </svg>`;
    const result = fixSvgViewBox(svg);
    expect(result).not.toContain('max-width: 116px');
    expect(result).toContain('max-width: 100%');
    expect(result).toContain('width="100%"');
  });

  it('should extract coordinates from path d attributes', () => {
    const svg = `<svg viewBox="0 0 10 10" style="max-width: 10px;" width="10px">
      <path d="M0,0 L400,200"/>
    </svg>`;
    const result = fixSvgViewBox(svg);
    const vbMatch = result.match(/viewBox="([^"]+)"/);
    const [, , w, h] = vbMatch![1].split(' ').map(Number);
    expect(w).toBeGreaterThan(300);
    expect(h).toBeGreaterThan(150);
  });

  it('should handle rect x/y/width/height attributes', () => {
    const svg = `<svg viewBox="0 0 10 10" style="max-width: 10px;" width="10px">
      <rect x="100" y="50" width="200" height="80"/>
    </svg>`;
    const result = fixSvgViewBox(svg);
    const vbMatch = result.match(/viewBox="([^"]+)"/);
    const [x, y, w, h] = vbMatch![1].split(' ').map(Number);
    // Should encompass rect from (100,50) to (300,130)
    expect(x + w).toBeGreaterThanOrEqual(300);
    expect(y + h).toBeGreaterThanOrEqual(130);
  });

  it('should return SVG unchanged if no coordinates found', () => {
    const svg = '<svg viewBox="0 0 100 100"><text>hello</text></svg>';
    const result = fixSvgViewBox(svg);
    expect(result).toContain('viewBox="0 0 100 100"');
  });

  it('should produce viewBox wider than 200px for all example-like diagrams', () => {
    // Simulates the structure mermaid produces for a multi-node LR graph
    const svg = `<svg viewBox="-8 -8 116 32" style="max-width: 116px;" width="116">
      <g class="node" transform="translate(58, 59)"><rect width="100" height="40"/></g>
      <g class="node" transform="translate(208, 59)"><rect width="100" height="40"/></g>
      <g class="node" transform="translate(508, 80)"><rect width="100" height="40"/></g>
      <g class="node" transform="translate(808, 59)"><rect width="100" height="40"/></g>
      <path d="M158,59 L208,59"/>
      <path d="M308,59 L508,80"/>
    </svg>`;
    const result = fixSvgViewBox(svg);
    const vbMatch = result.match(/viewBox="([^"]+)"/);
    const [, , w] = vbMatch![1].split(' ').map(Number);
    expect(w).toBeGreaterThan(200);
  });
});
