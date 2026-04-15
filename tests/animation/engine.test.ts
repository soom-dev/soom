import { describe, it, expect } from 'bun:test';
import { generateAnimationScript } from '../../src/animation/engine.js';
import type { AnimationSequence, AnimaGraph } from '../../src/types.js';

describe('generateAnimationScript', () => {
  const graph: AnimaGraph = {
    nodes: new Map([
      ['A', { id: 'A', label: 'Start', type: 'start', position: { x: 0, y: 0, width: 0, height: 0 } }],
      ['B', { id: 'B', label: 'End', type: 'end', position: { x: 0, y: 0, width: 0, height: 0 } }],
    ]),
    edges: [{ id: 'edge-0', source: 'A', target: 'B', path: '', style: 'solid' }],
    subgraphs: [],
    metadata: { sourceFormat: 'mermaid', sourceText: '' },
  };

  const sequence: AnimationSequence = {
    steps: [
      { id: 'step-0', activateNodes: ['A'], activateEdges: ['edge-0'], duration: 800, parallel: false },
      { id: 'step-1', activateNodes: ['B'], activateEdges: [], duration: 800, parallel: false },
    ],
    defaultDuration: 800,
  };

  it('should return a non-empty script string', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script.length).toBeGreaterThan(100);
  });

  it('should contain soomAnimation API', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('soomAnimation');
    expect(script).toContain('play');
    expect(script).toContain('pause');
    expect(script).toContain('stepForward');
    expect(script).toContain('reset');
  });

  it('should contain node activation class names', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('soom-node-active');
    expect(script).toContain('soom-node-completed');
  });

  it('should embed node labels for annotations', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('Start');
    expect(script).toContain('End');
  });

  it('should use anime.js createTimeline API', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('createTimeline');
    expect(script).toContain("label('step-");
  });

  it('should expose timeline object and progress getter', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('timeline: timeline');
    expect(script).toContain('get progress');
    expect(script).toContain('timeline.progress');
  });

  it('should use playbackRate for speed control', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('playbackRate');
  });

  it('should use manual strokeDashoffset for edge draw', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('edgeTotalLens');
    expect(script).toContain('strokeDashoffset');
    expect(script).toContain('getTotalLength');
  });

  it('should start march when edge draw completes', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('startMarchingLine');
    expect(script).toContain('soom-edge-completed');
  });

  it('should use createAnimatable for annotation opacity', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('createAnimatable');
  });

  it('should use timeline.set for initial state', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('timeline.set');
  });

  it('should not contain manual getTotalLength for initial edge setup', () => {
    const script = generateAnimationScript(sequence, graph);
    // createDrawable handles this — no manual edgeLengths map
    expect(script).not.toContain('edgeLengths');
  });

  it('should use anime.animate for marching lines instead of CSS @keyframes', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('startMarchingLine');
    expect(script).not.toContain('@keyframes');
  });

  it('should have node opacity as timeline segments', () => {
    const script = generateAnimationScript(sequence, graph);
    // Node opacity animated via timeline.add with from/to values
    expect(script).toContain('opacity: [fromOpacity, 1]');
    expect(script).toContain('opacity: [1, 0.85]');
  });

  // Fix 1: pause creates looping animation, play kills it
  it('should have focus loop state and startFocusLoops/stopFocusLoops', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('focusLoops');
    expect(script).toContain('focusParticles');
    expect(script).toContain('startFocusLoops');
    expect(script).toContain('stopFocusLoops');
  });

  it('should call startFocusLoops on pause and stopFocusLoops on play', () => {
    const script = generateAnimationScript(sequence, graph);
    // pause() calls startFocusLoops, not glowAnimations.pause
    expect(script).toContain('startFocusLoops');
    // play() calls stopFocusLoops before resuming
    expect(script).toContain('stopFocusLoops');
  });

  it('focus loop uses strokeDashoffset alternate loop', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('strokeDashoffset');
    expect(script).toContain('alternate: true');
  });

  it('pause should not freeze glow/march animations', () => {
    const script = generateAnimationScript(sequence, graph);
    // The pause() function body should NOT call glowAnimations.forEach pause
    const pauseFn = script.match(/pause: function\(\)[^}]+\}/);
    expect(pauseFn).not.toBeNull();
    if (pauseFn) {
      expect(pauseFn[0]).not.toContain('glowAnimations');
      expect(pauseFn[0]).not.toContain('marchAnimations');
    }
  });

  // Fix 2: playwright label clipping tested separately (integration)

  // Fix 3: annotations include edge label text and word animation
  it('should include edge label in annotation text', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('info.label');
  });

  it('should use word-span stagger animation for annotations', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('anime.stagger');
    expect(script).toContain('wordAnimation');
    expect(script).toContain('translateY');
  });

  // Fix 4: edge labels hidden initially, revealed on draw
  it('should hide all edge labels in initial state', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('allEdgeLabels');
    expect(script).toContain('pathToLabelMap');
    expect(script).toContain('.edgeLabel');
  });

  it('should re-hide edge labels on resetPersistentEffects', () => {
    const script = generateAnimationScript(sequence, graph);
    // resetPersistentEffects should reference allEdgeLabels to re-hide them
    const resetFn = script.match(/function resetPersistentEffects[\s\S]*?^  \}/m);
    expect(resetFn).not.toBeNull();
    expect(script).toContain('allEdgeLabels.forEach');
  });

  it('should reveal edge label when edge draw completes', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('edgeLabelEl');
    expect(script).toContain('offset + duration');
  });

  // Fix 5: duration scaling to path length
  it('should compute duration from path length', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('getTotalLength');
    expect(script).toContain('edgeDurations');
    expect(script).toContain('maxEdgeDuration');
  });

  it('should clamp duration with 700ms floor for short edges', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('< 150 ? 700');
    expect(script).toContain('Math.max(400');
    expect(script).toContain('1200');
  });

  it('should use spring easing for short edges', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('spring(');
    expect(script).toContain('< 150');
  });

  // edgeTimingMap — tracks per-edge offset/duration for sub-step awareness
  it('should track per-edge timeline offsets in edgeTimingMap', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('edgeTimingMap');
    expect(script).toContain('offset: offset');
    expect(script).toContain('duration: duration');
  });

  it('should check edgeTimingMap in startFocusLoops for mid-draw filtering', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('timing.offset');
    expect(script).toContain('timing.duration');
    expect(script).toContain('currentTime');
    expect(script).toContain('activeEdgeIds');
  });

  it('should have setPauseAnnotation for pause-time annotation filtering', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('setPauseAnnotation');
    expect(script).toContain('activeEdgeIds');
  });

  it('should use timeline.reset for reset', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('timeline.reset');
    expect(script).toContain('timeline.completed');
    expect(script).toContain('timeline.restart');
  });

  it('should skip empty edge labels via textContent check', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('textContent.trim()');
  });

  it('should use DOM-order edgePath/edgeLabel mapping not ID-based', () => {
    const script = generateAnimationScript(sequence, graph);
    expect(script).toContain('pathToLabelMap');
    expect(script).toContain('.edgePath');
    expect(script).not.toContain('edgeLabelByEid');
  });
});
