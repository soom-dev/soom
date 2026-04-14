import type { AnimationSequence, AnimaGraph } from '../graph/types.js';

/**
 * Generates a runtime JavaScript string that animates a Mermaid SVG diagram
 * using anime.js createTimeline() and v4 utilities as the single source of
 * truth for all animation state.
 *
 * anime.js utilities used:
 * - createTimeline() — master timeline for sequencing
 * - svg.createDrawable() — edge draw via `draw` property (replaces manual strokeDash)
 * - svg.createMotionPath() — flow particles along paths (replaces proxy + getPointAtLength)
 * - createAnimatable() — reactive annotation opacity
 * - Node opacity as timeline segments (replaces manual style.opacity)
 * - anime.animate() for marching lines (replaces CSS @keyframes)
 *
 * Persistent effects (glow pulse, marching lines) run as separate
 * anime.animate() calls outside the timeline.
 */
export function generateAnimationScript(_sequence: AnimationSequence, _graph: AnimaGraph): string {
  const nodeLabels: Record<string, string> = {};
  for (const [id, node] of _graph.nodes) {
    nodeLabels[id] = node.label;
  }
  const edgeSourceTarget: Record<string, { source: string; target: string; label?: string }> = {};
  for (const edge of _graph.edges) {
    edgeSourceTarget[edge.id] = {
      source: edge.source,
      target: edge.target,
      label: edge.label,
    };
  }

  return `
(function() {
  'use strict';

  var NODE_LABELS = ${JSON.stringify(nodeLabels)};
  var EDGE_INFO = ${JSON.stringify(edgeSourceTarget)};

  // ---- 1. Discover SVG structure ----
  var svgEl = document.querySelector('.diagram-container svg');
  if (!svgEl) return;

  var nodeMap = {};
  var edgeMap = {};

  svgEl.querySelectorAll('.node').forEach(function(el) {
    var rawId = el.getAttribute('id') || '';
    var match = rawId.match(/flowchart-(.+?)-\\d+$/);
    var nodeId = match ? match[1] : rawId;
    el.setAttribute('data-node-id', nodeId);
    nodeMap[nodeId] = el;
  });

  svgEl.querySelectorAll('path.flowchart-link, .edgePath path').forEach(function(pathEl) {
    var rawId = pathEl.getAttribute('id') || pathEl.parentElement.getAttribute('id') || '';
    var edgeMatch = rawId.match(/L[-_](.+?)[-_](.+?)[-_]\\d+$/);
    if (!edgeMatch) return;
    var source = edgeMatch[1];
    var target = edgeMatch[2];
    var edgeId = 'edge-' + source + '-' + target;
    edgeMap[edgeId] = { group: pathEl.parentElement || pathEl, path: pathEl };
  });

  function findEdgeBySourceTarget(source, target) {
    for (var eid in edgeMap) {
      if (eid.indexOf(source) !== -1 && eid.indexOf(target) !== -1) return edgeMap[eid];
    }
    return null;
  }

  // ---- 2. Read embedded sequence ----
  var seqEl = document.getElementById('soom-sequence');
  if (!seqEl) return;
  var sequence;
  try { sequence = JSON.parse(seqEl.textContent); } catch(e) { return; }
  var steps = sequence.steps || [];
  if (steps.length === 0) return;

  // ---- 3. Annotation panel (createAnimatable for reactive opacity) ----
  var annotEl = document.getElementById('soom-annotations');
  var annotAnim = annotEl ? anime.createAnimatable(annotEl, {
    opacity: { duration: 200, ease: 'outQuad' },
  }) : null;

  function setAnnotation(step) {
    if (!annotEl) return;
    while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
    var texts = [];
    if (step.activateEdges && step.activateEdges.length > 0) {
      step.activateEdges.forEach(function(eid) {
        var info = EDGE_INFO[eid];
        if (info) {
          var srcLabel = NODE_LABELS[info.source] || info.source;
          var tgtLabel = NODE_LABELS[info.target] || info.target;
          texts.push(srcLabel + ' \\u2192 ' + tgtLabel);
        }
      });
    }
    if (step.activateNodes && step.activateNodes.length > 0) {
      step.activateNodes.forEach(function(nid) {
        var label = NODE_LABELS[nid] || nid;
        if (texts.length === 0) texts.push(label + ' is processing');
      });
    }
    if (step.parallel && texts.length > 1) {
      var header = document.createElement('div');
      header.textContent = 'Simultaneously:';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '4px';
      annotEl.appendChild(header);
    }
    texts.forEach(function(t) {
      var div = document.createElement('div');
      div.textContent = t;
      annotEl.appendChild(div);
    });
    if (annotAnim) annotAnim.opacity(1);
  }

  // ---- 4. Edge resolution ----
  function resolveEdge(eid) {
    if (edgeMap[eid]) return edgeMap[eid];
    var info = EDGE_INFO[eid];
    if (info) {
      var found = findEdgeBySourceTarget(info.source, info.target);
      if (found) return found;
    }
    var idx = parseInt(eid.replace('edge-', ''));
    var keys = Object.keys(edgeMap);
    if (!isNaN(idx) && idx < keys.length) return edgeMap[keys[idx]];
    return null;
  }

  // ---- 5. Set initial state ----
  var svgNS = 'http://www.w3.org/2000/svg';

  // Node initial opacity via utils.set
  Object.keys(nodeMap).forEach(function(nid) {
    anime.utils.set(nodeMap[nid], { opacity: 0.4 });
  });

  // Edge initial state via svg.createDrawable — handles strokeDash automatically
  var drawableMap = {};
  Object.keys(edgeMap).forEach(function(eid) {
    var p = edgeMap[eid].path;
    var drawables = anime.svg.createDrawable(p);
    drawableMap[eid] = drawables[0];
    anime.utils.set(p, { opacity: 0.2 });
    // Hide arrow markers until edge draws
    p._origMarkerEnd = p.getAttribute('marker-end') || '';
    p._origMarkerStart = p.getAttribute('marker-start') || '';
    p.style.markerEnd = 'none';
    p.style.markerStart = 'none';
  });

  // ---- 6. Build master timeline ----
  var glowAnimations = [];
  var marchAnimations = [];

  function resetPersistentEffects() {
    glowAnimations.forEach(function(a) { if (a && a.pause) a.pause(); });
    glowAnimations = [];
    marchAnimations.forEach(function(a) { if (a && a.pause) a.pause(); });
    marchAnimations = [];
    // Clear inline stroke styles that may override drawable attributes
    Object.keys(edgeMap).forEach(function(eid) {
      edgeMap[eid].path.style.strokeDasharray = '';
      edgeMap[eid].path.style.strokeDashoffset = '';
    });
    // Remove CSS classes
    Object.keys(nodeMap).forEach(function(nid) {
      nodeMap[nid].classList.remove('soom-node-active', 'soom-node-completed');
    });
    Object.keys(edgeMap).forEach(function(eid) {
      edgeMap[eid].path.classList.remove('soom-edge-completed');
      edgeMap[eid].path.style.markerEnd = 'none';
      edgeMap[eid].path.style.markerStart = 'none';
    });
    // Hide annotation
    if (annotAnim) annotAnim.opacity(0);
    if (annotEl) {
      while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
    }
  }

  function startGlowPulse(nid) {
    if (!nodeMap[nid]) return;
    var shape = nodeMap[nid].querySelector('rect, polygon, circle');
    if (shape) {
      var anim = anime.animate(shape, {
        filter: ['drop-shadow(0 0 4px currentColor)', 'drop-shadow(0 0 14px currentColor)'],
        duration: 1500,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      });
      glowAnimations.push(anim);
    }
  }

  function startMarchingLine(pathEl) {
    anime.utils.set(pathEl, { strokeDasharray: '4 8' });
    var anim = anime.animate(pathEl, {
      strokeDashoffset: [0, -12],
      loop: true,
      duration: 800,
      ease: 'linear',
    });
    marchAnimations.push(anim);
  }

  var stepOffsets = [];
  var nodeActivated = {};
  var timeline = anime.createTimeline({
    autoplay: false,
    loop: true,
    loopDelay: 3000,
    defaults: { ease: 'inOutQuad' },
  });

  // Reset persistent effects at the start of each loop iteration
  timeline.call(resetPersistentEffects, 0);

  var offset = 0;

  steps.forEach(function(step, idx) {
    var duration = step.duration || 800;
    timeline.label('step-' + idx, offset);
    stepOffsets.push(offset);

    // Annotation update
    timeline.call(function() { setAnnotation(step); }, offset);

    // Track which nodes are activated in this step
    var activatedInStep = {};

    // Node activation: opacity on timeline + CSS class via .call()
    if (step.activateNodes) step.activateNodes.forEach(function(nid) {
      if (!nodeMap[nid]) return;
      activatedInStep[nid] = true;
      var fromOpacity = nodeActivated[nid] ? 0.85 : 0.4;
      nodeActivated[nid] = true;
      timeline.add(nodeMap[nid], { opacity: [fromOpacity, 1], duration: 150 }, offset);
      timeline.call(function() {
        nodeMap[nid].classList.add('soom-node-active');
      }, offset);
    });

    // Edge draws via createDrawable + flow particles
    if (step.activateEdges && step.activateEdges.length > 0) {
      step.activateEdges.forEach(function(eid) {
        var edge = resolveEdge(eid);
        if (!edge) return;
        var pathEl = edge.path;
        var info = EDGE_INFO[eid];
        var targetNodeId = info ? info.target : null;

        // Find drawable for this edge
        var drawable = drawableMap[eid];
        if (!drawable) {
          // Fallback: try to find by iterating drawableMap
          for (var dk in drawableMap) {
            if (dk.indexOf(eid.replace('edge-', '')) !== -1) {
              drawable = drawableMap[dk];
              break;
            }
          }
        }

        // Edge draw via svg.createDrawable
        if (drawable) {
          timeline.add(drawable, { draw: '0 1', duration: duration }, offset);
        }
        // Edge opacity fade-in alongside draw
        timeline.add(pathEl, { opacity: [0.2, 1], duration: duration }, offset);
        // Restore markers on edge completion
        timeline.call(function() {
          if (pathEl._origMarkerEnd) pathEl.style.markerEnd = pathEl._origMarkerEnd;
          if (pathEl._origMarkerStart) pathEl.style.markerStart = pathEl._origMarkerStart;
        }, offset + duration);

        // Flow particle via svg.createMotionPath
        var circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('r', '4');
        circle.classList.add('soom-flow-particle');
        circle.style.display = 'none';
        svgEl.appendChild(circle);

        // Try createMotionPath — falls back to proxy if path coordinates don't align
        var motionPathOk = false;
        try {
          var motion = anime.svg.createMotionPath(pathEl);
          if (motion && motion.x && motion.y) {
            timeline.add(circle, {
              translateX: motion.x,
              translateY: motion.y,
              duration: duration,
              onBegin: function() { circle.style.display = ''; },
              onComplete: function() { circle.style.display = 'none'; },
            }, offset);
            motionPathOk = true;
          }
        } catch(e) { /* createMotionPath not available or failed */ }

        if (!motionPathOk) {
          // Fallback: proxy object + getPointAtLength
          var len = pathEl.getTotalLength ? pathEl.getTotalLength() : 300;
          var proxy = { t: 0 };
          timeline.add(proxy, {
            t: [0, 1],
            duration: duration,
            onBegin: function() { circle.style.display = ''; },
            onRender: function() {
              if (circle.style.display !== 'none') {
                var pt = pathEl.getPointAtLength(proxy.t * len);
                circle.setAttribute('cx', pt.x);
                circle.setAttribute('cy', pt.y);
              }
            },
            onComplete: function() { circle.style.display = 'none'; },
          }, offset);
        }

        // Activate target node when edge arrives
        if (targetNodeId && nodeMap[targetNodeId] && !activatedInStep[targetNodeId]) {
          activatedInStep[targetNodeId] = true;
          var tFromOpacity = nodeActivated[targetNodeId] ? 0.85 : 0.4;
          nodeActivated[targetNodeId] = true;
          (function(nid, fromOp) {
            timeline.add(nodeMap[nid], { opacity: [fromOp, 1], duration: 150 }, offset + duration);
            timeline.call(function() {
              nodeMap[nid].classList.add('soom-node-active');
            }, offset + duration);
          })(targetNodeId, tFromOpacity);
        }
      });
    }

    // Step completion: transition activated nodes to completed
    var completeOffset = offset + duration + 200;
    var nodesInStep = Object.keys(activatedInStep);

    nodesInStep.forEach(function(nid) {
      if (!nodeMap[nid]) return;
      timeline.add(nodeMap[nid], { opacity: [1, 0.85], duration: 200 }, completeOffset);
      timeline.call(function() {
        nodeMap[nid].classList.remove('soom-node-active');
        nodeMap[nid].classList.add('soom-node-completed');
        startGlowPulse(nid);
      }, completeOffset);
    });

    // Marching dotted lines on completed edges via anime.animate()
    if (step.activateEdges) step.activateEdges.forEach(function(eid) {
      timeline.call(function() {
        var edge = resolveEdge(eid);
        if (edge) {
          edge.path.classList.add('soom-edge-completed');
          startMarchingLine(edge.path);
        }
      }, completeOffset);
    });

    // If no edges, add a dummy so timeline spans this step's duration
    if (!step.activateEdges || step.activateEdges.length === 0) {
      var dummy = { v: 0 };
      timeline.add(dummy, { v: 1, duration: duration }, offset);
    }

    offset = completeOffset + 200;
  });

  // Hold at end so last step's glow is visible before loop
  var endHold = { v: 0 };
  timeline.add(endHold, { v: 1, duration: 2000 }, offset);

  // ---- 7. Playback API ----
  function getCurrentStepIndex() {
    var t = timeline.currentTime;
    for (var i = stepOffsets.length - 1; i >= 0; i--) {
      if (t >= stepOffsets[i]) return i;
    }
    return 0;
  }

  // Lightweight seek helper — only manages CSS classes + persistent effects.
  // Timeline.seek() handles all animated properties (opacity, draw, etc.)
  function seekToStep(n) {
    resetPersistentEffects();
    // Apply completed CSS classes for steps before n
    for (var i = 0; i < n && i < steps.length; i++) {
      var s = steps[i];
      if (s.activateNodes) s.activateNodes.forEach(function(nid) {
        if (nodeMap[nid]) nodeMap[nid].classList.add('soom-node-completed');
      });
      if (s.activateEdges) s.activateEdges.forEach(function(eid) {
        var info = EDGE_INFO[eid];
        if (info && info.target && nodeMap[info.target]) {
          nodeMap[info.target].classList.add('soom-node-completed');
        }
        var edge = resolveEdge(eid);
        if (edge) {
          if (edge.path._origMarkerEnd) edge.path.style.markerEnd = edge.path._origMarkerEnd;
          if (edge.path._origMarkerStart) edge.path.style.markerStart = edge.path._origMarkerStart;
        }
      });
    }
    // Apply active CSS class for target step
    if (n < steps.length && steps[n].activateNodes) {
      steps[n].activateNodes.forEach(function(nid) {
        if (nodeMap[nid]) nodeMap[nid].classList.add('soom-node-active');
      });
    }
    // Update annotation
    if (n < steps.length) setAnnotation(steps[n]);
    // Seek timeline (handles opacity, draw, edge opacity)
    timeline.seek(stepOffsets[n], 1);
  }

  window.soomAnimation = {
    timeline: timeline,
    play: function() { timeline.play(); },
    pause: function() {
      timeline.pause();
      glowAnimations.forEach(function(a) { if (a && a.pause) a.pause(); });
      marchAnimations.forEach(function(a) { if (a && a.pause) a.pause(); });
    },
    stepForward: function() {
      var cur = getCurrentStepIndex();
      if (cur < steps.length - 1) {
        timeline.pause();
        seekToStep(cur + 1);
      }
    },
    stepBackward: function() {
      var cur = getCurrentStepIndex();
      if (cur > 0) {
        timeline.pause();
        seekToStep(cur - 1);
      }
    },
    goToStep: function(n) {
      if (n >= 0 && n < steps.length) {
        timeline.pause();
        seekToStep(n);
      }
    },
    reset: function() {
      timeline.pause();
      resetPersistentEffects();
      timeline.seek(0, 1);
    },
    setSpeed: function(multiplier) {
      timeline.playbackRate = multiplier || 1;
    },
    get currentStep() { return getCurrentStepIndex(); },
    get totalSteps() { return steps.length; },
    get progress() { return timeline.progress; },
  };

  // Auto-play on load
  setTimeout(function() { timeline.play(); }, 500);
})();`;
}
