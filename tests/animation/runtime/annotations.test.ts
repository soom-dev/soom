import { describe, it, expect } from 'bun:test';
import { buildAnnotationsJs } from '../../../src/animation/runtime/annotations.js';

describe('buildAnnotationsJs', () => {
  const js = buildAnnotationsJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should define setAnnotation function', () => {
    expect(js).toContain('function setAnnotation(step)');
  });

  it('should define setPauseAnnotation function', () => {
    expect(js).toContain('function setPauseAnnotation(activeEdgeIds)');
  });

  it('should reference EDGE_INFO and NODE_LABELS globals', () => {
    expect(js).toContain('EDGE_INFO[eid]');
    expect(js).toContain('NODE_LABELS[info.source]');
    expect(js).toContain('NODE_LABELS[info.target]');
  });

  it('should use createAnimatable for annotation element opacity', () => {
    expect(js).toContain('anime.createAnimatable');
    expect(js).toContain('soom-annotations');
  });

  it('should use word-by-word stagger animation', () => {
    expect(js).toContain('anime.stagger');
    expect(js).toContain('translateY');
    expect(js).toContain('wordAnimation');
  });

  it('should replace newlines in labels with spaces', () => {
    expect(js).toContain(".replace(/\\n/g, ' ')");
  });

  it('should include arrow character for edge annotations', () => {
    expect(js).toContain('\\u2192');
  });

  it('should show edge label in parentheses when present', () => {
    expect(js).toContain("info.label");
    expect(js).toContain("(' + info.label + ')");
  });

  it('should fall back to node names when no edges are active', () => {
    expect(js).toContain('texts.length === 0');
    expect(js).toContain('step.activateNodes');
  });

  it('should show "Simultaneously:" header for parallel steps with multiple texts', () => {
    expect(js).toContain('step.parallel');
    expect(js).toContain('Simultaneously:');
  });

  it('should pause previous wordAnimation before starting new one', () => {
    expect(js).toContain('wordAnimation.pause()');
  });

  it('should clear annotation element children before rebuilding', () => {
    expect(js).toContain('annotEl.firstChild');
    expect(js).toContain('annotEl.removeChild');
  });
});
