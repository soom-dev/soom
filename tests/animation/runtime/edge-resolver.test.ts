import { describe, it, expect } from 'bun:test';
import { buildEdgeResolverJs } from '../../../src/animation/runtime/edge-resolver.js';

describe('buildEdgeResolverJs', () => {
  const js = buildEdgeResolverJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should define resolveEdge function', () => {
    expect(js).toContain('function resolveEdge(eid)');
  });

  it('should check edgeMap first for direct lookup', () => {
    expect(js).toContain('edgeMap[eid]');
  });

  it('should fall back to EDGE_INFO source/target lookup', () => {
    expect(js).toContain('EDGE_INFO[eid]');
    expect(js).toContain('findEdgeBySourceTarget(info.source, info.target)');
  });

  it('should handle index-based fallback for edge-N format', () => {
    expect(js).toContain("parseInt(eid.replace('edge-', ''))");
    expect(js).toContain('Object.keys(edgeMap)');
    expect(js).toContain('isNaN(idx)');
  });

  it('should return null when no resolution succeeds', () => {
    expect(js).toContain('return null');
  });
});
