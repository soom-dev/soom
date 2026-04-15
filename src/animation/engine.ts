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

  // Parse edge SVG IDs using known node IDs to handle IDs containing _ or -
  function parseEdgeId(rawId) {
    var lIdx = rawId.search(/L[-_]/);
    if (lIdx < 0) return null;
    var body = rawId.slice(lIdx + 1);
    if (body.length < 2) return null;
    var delim = body[0];
    var rest = body.slice(1);
    var knownIds = Object.keys(nodeMap);
    for (var si = 0; si < knownIds.length; si++) {
      var src = knownIds[si];
      if (rest.indexOf(src) !== 0) continue;
      var afterSrc = rest.slice(src.length);
      if (afterSrc.length < 2 || afterSrc[0] !== delim) continue;
      var remaining = afterSrc.slice(1);
      for (var ti = 0; ti < knownIds.length; ti++) {
        var tgt = knownIds[ti];
        if (remaining.indexOf(tgt) !== 0) continue;
        var afterTgt = remaining.slice(tgt.length);
        if (afterTgt.length >= 2 && afterTgt[0] === delim && /^\\d+$/.test(afterTgt.slice(1))) {
          return { source: src, target: tgt };
        }
      }
    }
    return null;
  }

  svgEl.querySelectorAll('path.flowchart-link, .edgePath path').forEach(function(pathEl) {
    var rawId = pathEl.getAttribute('id') || pathEl.parentElement.getAttribute('id') || '';
    var parsed = parseEdgeId(rawId);
    if (!parsed) return;
    var edgeId = 'edge-' + parsed.source + '-' + parsed.target;
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
  var wordAnimation = null;  // Fix 3: track word stagger animation for cancellation

  function setAnnotation(step) {
    if (!annotEl) return;
    // Cancel previous word animation before clearing children
    if (wordAnimation) { wordAnimation.pause(); wordAnimation = null; }
    while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
    var texts = [];
    if (step.activateEdges && step.activateEdges.length > 0) {
      step.activateEdges.forEach(function(eid) {
        var info = EDGE_INFO[eid];
        if (info) {
          var srcLabel = (NODE_LABELS[info.source] || info.source).replace(/\\n/g, ' ');
          var tgtLabel = (NODE_LABELS[info.target] || info.target).replace(/\\n/g, ' ');
          var text = srcLabel + ' \\u2192 ' + tgtLabel;
          if (info.label) text += ' (' + info.label + ')';
          texts.push(text);
        }
      });
    }
    if (texts.length === 0 && step.activateNodes && step.activateNodes.length > 0) {
      step.activateNodes.forEach(function(nid) {
        texts.push(NODE_LABELS[nid] || nid);
      });
    }
    if (step.parallel && texts.length > 1) {
      var header = document.createElement('div');
      header.textContent = 'Simultaneously:';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '4px';
      annotEl.appendChild(header);
    }
    // Fix 3: split into word spans for stagger animation
    var allSpans = [];
    texts.forEach(function(t) {
      var div = document.createElement('div');
      var words = t.split(' ');
      words.forEach(function(word, wi) {
        var span = document.createElement('span');
        span.textContent = word + (wi < words.length - 1 ? ' ' : '');
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        div.appendChild(span);
        allSpans.push(span);
      });
      annotEl.appendChild(div);
    });
    if (annotAnim) annotAnim.opacity(1);
    if (allSpans.length > 0) {
      wordAnimation = anime.animate(allSpans, {
        opacity: [0, 1],
        translateY: ['4px', '0px'],
        duration: 200,
        delay: anime.stagger(35),
        ease: 'outQuad',
      });
    }
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

  // Compute marching line pattern from actual edge geometry
  var edgeLens = [];
  Object.keys(edgeMap).forEach(function(eid) {
    var p = edgeMap[eid].path;
    if (p.getTotalLength) edgeLens.push(p.getTotalLength());
  });
  edgeLens.sort(function(a, b) { return a - b; });
  var medianEdgeLen = edgeLens[Math.floor(edgeLens.length / 2)] || 100;
  // 8 dash-gap pairs visible on the median-length edge
  var marchRepeat = Math.round(medianEdgeLen / 8);
  var marchGap = Math.round(marchRepeat * 3 / 5);
  var marchDash = marchRepeat - marchGap;

  // Edge measurement + marker caching (pre-timeline)
  var edgeTotalLens = {};
  Object.keys(edgeMap).forEach(function(eid) {
    var p = edgeMap[eid].path;
    var totalLen = p.getTotalLength ? p.getTotalLength() : 300;
    edgeTotalLens[eid] = totalLen;
    p.setAttribute('stroke-dasharray', String(totalLen));
    p._origMarkerEnd = p.getAttribute('marker-end') || '';
    p._origMarkerStart = p.getAttribute('marker-start') || '';
    p.style.markerEnd = 'none';
    p.style.markerStart = 'none';
  });

  // Fix 4: Build edge label map using DOM-order iteration (not ID order)
  var allEdgeLabels = Array.from(svgEl.querySelectorAll('.edgeLabel'));
  var edgePaths = svgEl.querySelectorAll('.edgePath');
  var pathToLabelMap = new Map();
  edgePaths.forEach(function(ep, i) {
    if (i < allEdgeLabels.length) {
      var pathEl = ep.querySelector('path');
      if (pathEl) pathToLabelMap.set(pathEl, allEdgeLabels[i]);
    }
  });

  // ---- 6. Build master timeline ----
  var glowAnimations = [];
  var marchAnimations = [];
  var focusLoops = [];      // Fix 1: looping animations created on pause
  var focusParticles = [];  // Fix 1: particle elements created on pause (need cleanup)

  // Fix 1: kill focus loop animations and remove their particles
  function stopFocusLoops() {
    focusLoops.forEach(function(a) { if (a) a.revert(); });
    focusLoops = [];
    focusParticles.forEach(function(el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    focusParticles = [];
  }

  function resetPersistentEffects() {
    // Stop all independent looping animations and revert their values
    stopFocusLoops();
    glowAnimations.forEach(function(a) { if (a) a.revert(); });
    glowAnimations = [];
    marchAnimations.forEach(function(a) { if (a) a.revert(); });
    marchAnimations = [];
    // Clear glow filter styles (revert may not remove inline filter)
    Object.keys(nodeMap).forEach(function(nid) {
      var shape = nodeMap[nid].querySelector('rect, polygon, circle');
      if (shape) shape.style.removeProperty('filter');
    });
    // Clear march inline styles so timeline-managed values show through
    Object.keys(edgeMap).forEach(function(eid) {
      var p = edgeMap[eid].path;
      p.style.removeProperty('stroke-dasharray');
      p.style.removeProperty('stroke-width');
    });
    // Remove CSS classes (not managed by timeline)
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

  // Fix 3: show annotation for only the actively drawing edges during pause
  function setPauseAnnotation(activeEdgeIds) {
    if (!annotEl) return;
    if (wordAnimation) { wordAnimation.pause(); wordAnimation = null; }
    while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
    var texts = [];
    activeEdgeIds.forEach(function(eid) {
      var info = EDGE_INFO[eid];
      if (info) {
        var srcLabel = (NODE_LABELS[info.source] || info.source).replace(/\\n/g, ' ');
        var tgtLabel = (NODE_LABELS[info.target] || info.target).replace(/\\n/g, ' ');
        var text = srcLabel + ' \\u2192 ' + tgtLabel;
        if (info.label) text += ' (' + info.label + ')';
        texts.push(text);
      }
    });
    if (texts.length === 0) return;
    var allSpans = [];
    texts.forEach(function(t) {
      var div = document.createElement('div');
      var words = t.split(' ');
      words.forEach(function(word, wi) {
        var span = document.createElement('span');
        span.textContent = word + (wi < words.length - 1 ? ' ' : '');
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        div.appendChild(span);
        allSpans.push(span);
      });
      annotEl.appendChild(div);
    });
    if (annotAnim) annotAnim.opacity(1);
    if (allSpans.length > 0) {
      wordAnimation = anime.animate(allSpans, {
        opacity: [0, 1], translateY: ['4px', '0px'],
        duration: 200, delay: anime.stagger(35), ease: 'outQuad',
      });
    }
  }

  // Fix 1: create looping draw + particle only for mid-draw edges while paused
  function startFocusLoops() {
    var stepIdx = getCurrentStepIndex();
    if (stepIdx < 0 || stepIdx >= steps.length) return;
    var step = steps[stepIdx];
    if (!step.activateEdges || step.activateEdges.length === 0) return;

    var currentTime = timeline.currentTime;
    var activeEdgeIds = [];

    step.activateEdges.forEach(function(eid) {
      var timing = edgeTimingMap[eid];
      if (!timing) return;
      // Skip edges that haven't started drawing yet
      if (currentTime < timing.offset) return;
      // Skip edges that have already completed drawing
      if (currentTime >= timing.offset + timing.duration) return;

      // This edge is mid-draw — create focus loop
      activeEdgeIds.push(eid);

      var edge = resolveEdge(eid);
      if (!edge) return;
      var pathEl = edge.path;

      // Loop draw/erase via strokeDashoffset
      var totalLen = edgeTotalLens[eid] || 300;
      pathEl.style.strokeDasharray = String(totalLen);
      var focusAnim = anime.animate(pathEl, {
        strokeDashoffset: [0, totalLen],
        duration: 700,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      });
      focusLoops.push(focusAnim);
    });

    // Fix 3: update annotation to show only actively drawing edges
    if (activeEdgeIds.length > 0) {
      setPauseAnnotation(activeEdgeIds);
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
    // Thicken stroke relative to its existing width
    var baseWidth = parseFloat(pathEl.getAttribute('stroke-width') || '1');
    pathEl.style.strokeWidth = String(baseWidth * 1.5);
    // Set march pattern — no drawable to conflict, style overrides the attribute
    pathEl.style.strokeDasharray = marchDash + ' ' + marchGap;
    // Constant velocity: full median traversal in ~3s
    var anim = anime.animate(pathEl, {
      strokeDashoffset: [0, -marchRepeat],
      loop: true,
      duration: Math.round(marchRepeat / medianEdgeLen * 3000),
      ease: 'linear',
      composition: 'none',
    });
    marchAnimations.push(anim);
  }

  var stepOffsets = [];
  var stepEndOffsets = [];
  var edgeTimingMap = {};
  var nodeActivated = {};
  var timeline = anime.createTimeline({
    autoplay: false,
    loop: true,
    loopDelay: 3000,
    defaults: { ease: 'inOutQuad' },
    onLoop: function() { resetPersistentEffects(); },
  });

  // Initial state via timeline.set() — makes timeline.seek() the source of truth
  Object.keys(nodeMap).forEach(function(nid) {
    timeline.set(nodeMap[nid], { opacity: 0.4 }, 0);
  });
  Object.keys(edgeMap).forEach(function(eid) {
    timeline.set(edgeMap[eid].path, { strokeDashoffset: edgeTotalLens[eid] || 300, opacity: 0.2 }, 0);
  });
  allEdgeLabels.forEach(function(el) {
    timeline.set(el, { opacity: 0 }, 0);
  });

  // Idle gap — diagram at rest before first step (step 0 = idle)
  var idleGap = 500;
  var idleDummy = { v: 0 };
  timeline.add(idleDummy, { v: 1, duration: idleGap }, 0);
  var offset = idleGap;

  steps.forEach(function(step, idx) {
    // Fix 5: pre-compute per-edge durations for this step (need max for completeOffset)
    var edgeDurations = {};
    var maxEdgeDuration = 0;
    if (step.activateEdges) {
      step.activateEdges.forEach(function(eid) {
        var edge = resolveEdge(eid);
        var pathLen = (edge && edge.path.getTotalLength) ? edge.path.getTotalLength() : 300;
        var d = pathLen < 150 ? 700 : Math.max(400, Math.min(Math.round(pathLen * 3), 1200));
        edgeDurations[eid] = d;
        if (d > maxEdgeDuration) maxEdgeDuration = d;
      });
    }
    var stepDuration = maxEdgeDuration || (step.duration || 800);

    timeline.label('step-' + idx, offset);
    stepOffsets.push(offset);
    stepEndOffsets.push(offset + stepDuration + 399); // past edge draw + completion transition

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

        // Fix 5: use path-length-based duration and spring easing for short edges
        var pathLen = pathEl.getTotalLength ? pathEl.getTotalLength() : 300;
        var duration = edgeDurations[eid] || (pathLen < 150 ? 700 : Math.max(400, Math.min(Math.round(pathLen * 3), 1200)));
        var easing = pathLen < 150 ? 'spring(1, 80, 10, 0)' : 'inOutQuad';
        edgeTimingMap[eid] = { offset: offset, duration: duration };

        // Edge draw via strokeDashoffset (totalLen → 0 reveals the stroke)
        var totalLen = edgeTotalLens[eid] || pathLen;
        timeline.add(pathEl, { strokeDashoffset: [totalLen, 0], duration: duration, ease: easing }, offset);
        // Edge opacity fade-in alongside draw
        timeline.add(pathEl, { opacity: [0.2, 1], duration: duration }, offset);
        // Restore markers + start march when edge draw completes
        (function(p, eid2) {
          timeline.call(function() {
            if (p._origMarkerEnd) p.style.markerEnd = p._origMarkerEnd;
            if (p._origMarkerStart) p.style.markerStart = p._origMarkerStart;
            p.classList.add('soom-edge-completed');
            startMarchingLine(p);
          }, offset + duration);
        })(pathEl, eid);

        // Edge label: reveal when edge draw completes (same time as march)
        var edgeLabelEl = pathToLabelMap.get(pathEl);
        if (edgeLabelEl && !edgeLabelEl.textContent.trim()) edgeLabelEl = null;
        if (edgeLabelEl) {
          timeline.add(edgeLabelEl, { opacity: [0, 1], duration: 200 }, offset + duration);
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
    var completeOffset = offset + stepDuration + 200;
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

    // If no edges, add a dummy so timeline spans this step's duration
    if (!step.activateEdges || step.activateEdges.length === 0) {
      var dummy = { v: 0 };
      timeline.add(dummy, { v: 1, duration: stepDuration }, offset);
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
    return -1; // idle state (before first step)
  }

  function seekToStep(n) {
    // 1. Stop persistent loops and clean CSS/markers
    resetPersistentEffects();

    // 2. Let timeline restore all animated properties (opacity, strokeDashoffset, labels)
    // muteCallbacks=true prevents timeline.call() from firing during seek
    timeline.seek(stepEndOffsets[n], true);

    // 3. Apply completed state for all steps up to and including n
    // Each step position shows the fully completed result of that step
    for (var i = 0; i <= n && i < steps.length; i++) {
      var s = steps[i];
      if (s.activateNodes) s.activateNodes.forEach(function(nid) {
        if (nodeMap[nid]) {
          nodeMap[nid].classList.add('soom-node-completed');
          startGlowPulse(nid);
        }
      });
      if (s.activateEdges) s.activateEdges.forEach(function(eid) {
        var info = EDGE_INFO[eid];
        if (info && info.target && nodeMap[info.target]) {
          nodeMap[info.target].classList.add('soom-node-completed');
          startGlowPulse(info.target);
        }
        var edge = resolveEdge(eid);
        if (edge) {
          if (edge.path._origMarkerEnd) edge.path.style.markerEnd = edge.path._origMarkerEnd;
          if (edge.path._origMarkerStart) edge.path.style.markerStart = edge.path._origMarkerStart;
          edge.path.classList.add('soom-edge-completed');
          startMarchingLine(edge.path);
        }
      });
    }

    // 4. Set annotation for step n — complete word animation instantly (no stagger on seek)
    if (n < steps.length) {
      setAnnotation(steps[n]);
      if (wordAnimation) wordAnimation.complete();
    }
  }

  window.soomAnimation = {
    timeline: timeline,
    play: function() {
      stopFocusLoops();
      if (timeline.completed) {
        resetPersistentEffects();
        timeline.restart();
        return;
      }
      timeline.play();
    },
    pause: function() {
      timeline.pause();
      startFocusLoops();
    },
    stepForward: function() {
      var cur = getCurrentStepIndex() + 1;
      if (cur < steps.length) {
        timeline.pause();
        seekToStep(cur);
      }
    },
    stepBackward: function() {
      var cur = getCurrentStepIndex() + 1;
      if (cur > 0) {
        this.goToStep(cur - 1);
      }
    },
    goToStep: function(n) {
      timeline.pause();
      if (n <= 0) {
        resetPersistentEffects();
        timeline.seek(0, true);
      } else if (n <= steps.length) {
        seekToStep(n - 1);
      }
    },
    reset: function() {
      resetPersistentEffects();
      timeline.reset();
    },
    setSpeed: function(multiplier) {
      timeline.playbackRate = multiplier || 1;
    },
    get currentStep() { return getCurrentStepIndex() + 1; }, // 0=idle, 1..N=actions
    get totalSteps() { return steps.length; }, // number of action steps
    get progress() { return timeline.progress; },
  };

  // Auto-play on load
  setTimeout(function() { timeline.play(); }, 500);
})();`;
}
