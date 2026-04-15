import { describe, it, expect } from 'bun:test';
import { buildInitialStateJs } from '../../../src/animation/runtime/initial-state.js';

describe('buildInitialStateJs', () => {
  const js = buildInitialStateJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should compute median edge length for marching pattern', () => {
    expect(js).toContain('edgeLens');
    expect(js).toContain('medianEdgeLen');
    expect(js).toContain('Math.floor(edgeLens.length / 2)');
  });

  it('should derive march dash and gap from median length', () => {
    expect(js).toContain('marchRepeat');
    expect(js).toContain('marchGap');
    expect(js).toContain('marchDash');
  });

  it('should cache edge total lengths', () => {
    expect(js).toContain('edgeTotalLens');
    expect(js).toContain('getTotalLength');
  });

  it('should set stroke-dasharray on edges for draw animation', () => {
    expect(js).toContain('stroke-dasharray');
    expect(js).toContain('String(totalLen)');
  });

  it('should save and hide original markers', () => {
    expect(js).toContain('_origMarkerEnd');
    expect(js).toContain('_origMarkerStart');
    expect(js).toContain("style.markerEnd = 'none'");
    expect(js).toContain("style.markerStart = 'none'");
  });

  it('should build DOM-order edge label mapping', () => {
    expect(js).toContain('allEdgeLabels');
    expect(js).toContain('.edgeLabel');
    expect(js).toContain('pathToLabelMap');
    expect(js).toContain('.edgePath');
  });

  it('should define SVG namespace variable', () => {
    expect(js).toContain("var svgNS = 'http://www.w3.org/2000/svg'");
  });
});
