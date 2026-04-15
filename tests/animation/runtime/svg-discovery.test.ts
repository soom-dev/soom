import { describe, it, expect } from 'bun:test';
import { buildSvgDiscoveryJs } from '../../../src/animation/runtime/svg-discovery.js';

describe('buildSvgDiscoveryJs', () => {
  const js = buildSvgDiscoveryJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should query for SVG element in diagram container', () => {
    expect(js).toContain(".querySelector('.diagram-container svg')");
  });

  it('should guard against missing SVG element', () => {
    expect(js).toContain('if (!svgEl) return');
  });

  it('should build nodeMap from .node elements', () => {
    expect(js).toContain('var nodeMap = {}');
    expect(js).toContain(".querySelectorAll('.node')");
    expect(js).toContain('data-node-id');
  });

  it('should extract node ID from flowchart ID pattern', () => {
    expect(js).toContain('flowchart-(.+?)-');
    expect(js).toContain('match[1]');
  });

  it('should build edgeMap from edge path elements', () => {
    expect(js).toContain('var edgeMap = {}');
    expect(js).toContain('path.flowchart-link');
    expect(js).toContain('.edgePath path');
  });

  it('should define parseEdgeId function for edge ID parsing', () => {
    expect(js).toContain('function parseEdgeId(rawId)');
  });

  it('should parse source and target from edge ID using delimiter matching', () => {
    expect(js).toContain('knownIds');
    expect(js).toContain('src');
    expect(js).toContain('tgt');
    expect(js).toContain('source:');
    expect(js).toContain('target:');
  });

  it('should define findEdgeBySourceTarget helper', () => {
    expect(js).toContain('function findEdgeBySourceTarget(source, target)');
  });

  it('should search edgeMap by source and target substring in findEdgeBySourceTarget', () => {
    expect(js).toContain("eid.indexOf(source) !== -1");
    expect(js).toContain("eid.indexOf(target) !== -1");
  });

  it('should return null from parseEdgeId when parsing fails', () => {
    expect(js).toContain('return null');
  });

  it('should validate trailing numeric segment in edge ID', () => {
    expect(js).toContain('/^\\d+$/');
  });
});
