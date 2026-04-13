import type { AnimationSequence, AnimaGraph } from '../graph/types.js';

/**
 * Generates a runtime JavaScript string that animates a Mermaid SVG diagram
 * using anime.js createTimeline() as the single source of truth for all
 * animation state.
 *
 * The generated script runs in the browser inside the output HTML. It:
 * 1. Discovers SVG structure (nodes, edges, labels) from the Mermaid DOM
 * 2. Reads the embedded AnimationSequence from a JSON script tag
 * 3. Builds a master anime.js timeline with all animation steps
 * 4. Exposes window.soomAnimation API with timeline-based controls
 *
 * Persistent effects (glow pulse, marching dotted lines) run as separate
 * anime.animate() calls outside the timeline since they loop independently
 * and should not rewind on seek.
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

  // ---- 3. Annotation panel ----
  var annotEl = document.getElementById('soom-annotations');

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
    annotEl.style.opacity = '1';
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
  var edgeLengths = {};

  Object.keys(nodeMap).forEach(function(nid) {
    nodeMap[nid].style.opacity = '0.4';
  });
  Object.keys(edgeMap).forEach(function(eid) {
    var p = edgeMap[eid].path;
    var len = p.getTotalLength ? p.getTotalLength() : 300;
    edgeLengths[eid] = len;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.style.opacity = '0.2';
    p._origMarkerEnd = p.getAttribute('marker-end') || '';
    p._origMarkerStart = p.getAttribute('marker-start') || '';
    p.style.markerEnd = 'none';
    p.style.markerStart = 'none';
  });

  // ---- 6. Build master timeline ----
  var glowAnimations = [];

  function resetState() {
    Object.keys(nodeMap).forEach(function(nid) {
      nodeMap[nid].classList.remove('soom-node-active', 'soom-node-completed');
    });
    Object.keys(edgeMap).forEach(function(eid) {
      edgeMap[eid].path.classList.remove('soom-edge-completed');
      edgeMap[eid].path.style.markerEnd = 'none';
      edgeMap[eid].path.style.markerStart = 'none';
    });
    glowAnimations.forEach(function(a) { if (a && a.pause) a.pause(); });
    glowAnimations = [];
    if (annotEl) {
      while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
      annotEl.style.opacity = '0';
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

  var stepOffsets = [];
  var timeline = anime.createTimeline({
    autoplay: false,
    loop: true,
    loopDelay: 3000,
    defaults: { ease: 'inOutQuad' },
  });

  // Reset CSS classes at the start of each loop iteration
  timeline.call(resetState, 0);

  var offset = 0;

  steps.forEach(function(step, idx) {
    var duration = step.duration || 800;
    timeline.label('step-' + idx, offset);
    stepOffsets.push(offset);

    // Annotation update
    timeline.call(function() { setAnnotation(step); }, offset);

    // Node activation via .call() — CSS transition handles the visual smoothing
    if (step.activateNodes) step.activateNodes.forEach(function(nid) {
      if (!nodeMap[nid]) return;
      timeline.call(function() {
        nodeMap[nid].style.opacity = '1';
        nodeMap[nid].classList.add('soom-node-active');
      }, offset);
    });

    // Track which nodes are activated in this step (for completion)
    var activatedInStep = {};
    if (step.activateNodes) step.activateNodes.forEach(function(nid) {
      activatedInStep[nid] = true;
    });

    // Edge draws + flow particles on the timeline
    if (step.activateEdges && step.activateEdges.length > 0) {
      step.activateEdges.forEach(function(eid) {
        var edge = resolveEdge(eid);
        if (!edge) return;
        var pathEl = edge.path;
        var len = pathEl.getTotalLength ? pathEl.getTotalLength() : 300;
        var info = EDGE_INFO[eid];
        var targetNodeId = info ? info.target : null;

        // Edge draw: strokeDashoffset animation on the timeline
        timeline.add(pathEl, {
          strokeDashoffset: [len, 0],
          opacity: [0.2, 1],
          duration: duration,
          onComplete: function() {
            if (pathEl._origMarkerEnd) pathEl.style.markerEnd = pathEl._origMarkerEnd;
            if (pathEl._origMarkerStart) pathEl.style.markerStart = pathEl._origMarkerStart;
          },
        }, offset);

        // Flow particle: proxy object animated on the timeline
        var circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('r', '4');
        circle.classList.add('soom-flow-particle');
        circle.style.display = 'none';
        svgEl.appendChild(circle);

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

        // Activate target node when edge arrives
        if (targetNodeId && nodeMap[targetNodeId] && !activatedInStep[targetNodeId]) {
          activatedInStep[targetNodeId] = true;
          (function(nid) {
            timeline.call(function() {
              nodeMap[nid].style.opacity = '1';
              nodeMap[nid].classList.add('soom-node-active');
            }, offset + duration);
          })(targetNodeId);
        }
      });
    }

    // Step completion: transition all activated nodes to completed state
    var completeOffset = offset + duration + 100;
    var nodesInStep = Object.keys(activatedInStep);

    nodesInStep.forEach(function(nid) {
      timeline.call(function() {
        if (!nodeMap[nid]) return;
        nodeMap[nid].style.opacity = '0.85';
        nodeMap[nid].classList.remove('soom-node-active');
        nodeMap[nid].classList.add('soom-node-completed');
        startGlowPulse(nid);
      }, completeOffset);
    });

    // Marching dotted lines on completed edges
    if (step.activateEdges) step.activateEdges.forEach(function(eid) {
      timeline.call(function() {
        var edge = resolveEdge(eid);
        if (edge) {
          edge.path.style.strokeDasharray = '';
          edge.path.style.strokeDashoffset = '';
          edge.path.classList.add('soom-edge-completed');
        }
      }, completeOffset);
    });

    // If no edges, add a dummy animation so the timeline spans this step's duration
    if (!step.activateEdges || step.activateEdges.length === 0) {
      var dummy = { v: 0 };
      timeline.add(dummy, { v: 1, duration: duration }, offset);
    }

    offset = completeOffset + 200;
  });

  // Hold at end: extend timeline so last step's glow is visible before loop
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

  function applyClassesForStep(targetStep) {
    resetState();
    // Reset all edges to initial drawing state
    Object.keys(edgeMap).forEach(function(eid) {
      var p = edgeMap[eid].path;
      var len = edgeLengths[eid] || 300;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.style.opacity = '0.2';
    });
    // Reset all nodes to initial state
    Object.keys(nodeMap).forEach(function(nid) {
      nodeMap[nid].style.opacity = '0.4';
    });
    // Apply completed state for all steps before targetStep
    for (var i = 0; i < targetStep && i < steps.length; i++) {
      var s = steps[i];
      if (s.activateNodes) s.activateNodes.forEach(function(nid) {
        if (nodeMap[nid]) {
          nodeMap[nid].style.opacity = '0.85';
          nodeMap[nid].classList.add('soom-node-completed');
        }
      });
      if (s.activateEdges) s.activateEdges.forEach(function(eid) {
        var info = EDGE_INFO[eid];
        if (info && info.target && nodeMap[info.target]) {
          nodeMap[info.target].style.opacity = '0.85';
          nodeMap[info.target].classList.add('soom-node-completed');
        }
        var edge = resolveEdge(eid);
        if (edge) {
          edge.path.style.strokeDasharray = '';
          edge.path.style.strokeDashoffset = '0';
          edge.path.style.opacity = '1';
          edge.path.classList.add('soom-edge-completed');
          if (edge.path._origMarkerEnd) edge.path.style.markerEnd = edge.path._origMarkerEnd;
          if (edge.path._origMarkerStart) edge.path.style.markerStart = edge.path._origMarkerStart;
        }
      });
    }
    // Apply active state for current step's nodes
    if (targetStep < steps.length) {
      var s = steps[targetStep];
      if (s.activateNodes) s.activateNodes.forEach(function(nid) {
        if (nodeMap[nid]) {
          nodeMap[nid].style.opacity = '1';
          nodeMap[nid].classList.add('soom-node-active');
        }
      });
    }
    // Update annotation for target step
    if (targetStep < steps.length) {
      setAnnotation(steps[targetStep]);
    }
  }

  window.soomAnimation = {
    timeline: timeline,
    play: function() { timeline.play(); },
    pause: function() {
      timeline.pause();
      glowAnimations.forEach(function(a) { if (a && a.pause) a.pause(); });
    },
    stepForward: function() {
      var cur = getCurrentStepIndex();
      if (cur < steps.length - 1) {
        var next = cur + 1;
        timeline.pause();
        applyClassesForStep(next);
        timeline.seek(stepOffsets[next], 1);
      }
    },
    stepBackward: function() {
      var cur = getCurrentStepIndex();
      if (cur > 0) {
        var prev = cur - 1;
        timeline.pause();
        applyClassesForStep(prev);
        timeline.seek(stepOffsets[prev], 1);
      }
    },
    goToStep: function(n) {
      if (n >= 0 && n < steps.length) {
        timeline.pause();
        applyClassesForStep(n);
        timeline.seek(stepOffsets[n], 1);
      }
    },
    reset: function() {
      timeline.pause();
      resetState();
      Object.keys(edgeMap).forEach(function(eid) {
        var p = edgeMap[eid].path;
        var len = edgeLengths[eid] || 300;
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.style.opacity = '0.2';
      });
      Object.keys(nodeMap).forEach(function(nid) {
        nodeMap[nid].style.opacity = '0.4';
      });
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
