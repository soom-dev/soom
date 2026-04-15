import { describe, it, expect } from 'bun:test';
import { buildTimelineJs } from '../../../src/animation/runtime/timeline-builder.js';

describe('buildTimelineJs', () => {
  const js = buildTimelineJs();

  it('should return a non-empty string', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('should create timeline with autoplay false and loop true', () => {
    expect(js).toContain('anime.createTimeline');
    expect(js).toContain('autoplay: false');
    expect(js).toContain('loop: true');
  });

  it('should set loop delay', () => {
    expect(js).toContain('loopDelay: 3000');
  });

  it('should reset persistent effects on loop', () => {
    expect(js).toContain('onLoop');
    expect(js).toContain('resetPersistentEffects()');
  });

  it('should use inOutQuad as default ease', () => {
    expect(js).toContain("ease: 'inOutQuad'");
  });

  it('should declare stepOffsets and stepEndOffsets arrays', () => {
    expect(js).toContain('var stepOffsets = []');
    expect(js).toContain('var stepEndOffsets = []');
  });

  it('should declare edgeTimingMap for per-edge timing', () => {
    expect(js).toContain('var edgeTimingMap = {}');
  });

  it('should set initial node opacity and shadow via timeline.set', () => {
    expect(js).toContain("timeline.set(nodeMap[nid], { opacity: 0.4, filter: 'drop-shadow(2px 3px 4px var(--soom-shadow-rest))' }, 0)");
  });

  it('should set initial edge state via timeline.set', () => {
    expect(js).toContain('timeline.set(edgeMap[eid].path');
    expect(js).toContain('strokeDashoffset');
    expect(js).toContain('opacity: 0.2');
  });

  it('should hide edge labels initially', () => {
    expect(js).toContain('allEdgeLabels.forEach');
    expect(js).toContain('opacity: 0');
  });

  it('should add idle gap before first step', () => {
    expect(js).toContain('var idleGap = 500');
    expect(js).toContain('idleDummy');
  });

  it('should label each step in the timeline', () => {
    expect(js).toContain("timeline.label('step-' + idx, offset)");
  });

  it('should compute edge duration from path length', () => {
    expect(js).toContain('getTotalLength');
    expect(js).toContain('edgeDurations');
    expect(js).toContain('maxEdgeDuration');
  });

  it('should clamp edge duration with floor and ceiling', () => {
    expect(js).toContain('< 150 ? 700');
    expect(js).toContain('Math.max(400');
    expect(js).toContain('1200');
  });

  it('should use spring easing for short edges', () => {
    expect(js).toContain("spring(1, 80, 10, 0)");
  });

  it('should animate node opacity transitions', () => {
    expect(js).toContain('opacity: [fromOpacity, 1]');
    expect(js).toContain('opacity: [1, 0.85]');
  });

  it('should add node active class during step and completed after', () => {
    expect(js).toContain("classList.add('soom-node-active')");
    expect(js).toContain("classList.remove('soom-node-active')");
    expect(js).toContain("classList.add('soom-node-completed')");
  });

  it('should call setAnnotation at step start', () => {
    expect(js).toContain('timeline.call(function() { setAnnotation(step); }');
  });

  it('should store edge timing for focus loop filtering', () => {
    expect(js).toContain('edgeTimingMap[eid] = { offset: offset, duration: duration }');
  });

  it('should restore markers and start marching line when edge draw completes', () => {
    expect(js).toContain('_origMarkerEnd');
    expect(js).toContain('startMarchingLine');
    expect(js).toContain('soom-edge-completed');
  });

  it('should reveal edge label on edge draw completion', () => {
    expect(js).toContain('edgeLabelEl');
    expect(js).toContain('pathToLabelMap.get(pathEl)');
    expect(js).toContain('opacity: [0, 1]');
  });

  it('should skip empty edge labels', () => {
    expect(js).toContain('textContent.trim()');
  });

  it('should activate target node when edge completes', () => {
    expect(js).toContain('targetNodeId');
    expect(js).toContain('activatedInStep');
  });

  it('should add end hold at the end of timeline', () => {
    expect(js).toContain('var endHold');
    expect(js).toContain('duration: 2000');
  });

  it('should track nodeActivated state for from-opacity selection', () => {
    expect(js).toContain('var nodeActivated = {}');
    expect(js).toContain('nodeActivated[nid]');
  });
});
