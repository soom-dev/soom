import type { AnimationSequence, AnimaGraph } from '../graph/types.js';

/**
 * Generates a runtime JavaScript string that animates a Mermaid SVG diagram.
 *
 * The generated script runs in the browser inside the output HTML. It:
 * 1. Discovers SVG structure (nodes, edges, labels) from the Mermaid DOM
 * 2. Reads the embedded AnimationSequence from a JSON script tag
 * 3. Sets all elements to inactive state
 * 4. Plays through each step: edge draw, flow particles, node activation, annotations
 * 5. Exposes window.soomAnimation API for programmatic control
 */
export function generateAnimationScript(_sequence: AnimationSequence, _graph: AnimaGraph): string {
  // Build label lookup for annotation text generation
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

  var nodeMap = {};   // nodeId -> DOM element
  var edgeMap = {};   // edgeId -> { group: g, path: path }

  // Parse node elements
  svgEl.querySelectorAll('.node').forEach(function(el) {
    var rawId = el.getAttribute('id') || '';
    var match = rawId.match(/flowchart-(.+?)-\\d+$/);
    var nodeId = match ? match[1] : rawId;
    el.setAttribute('data-node-id', nodeId);
    nodeMap[nodeId] = el;
  });

  // Parse edge elements
  svgEl.querySelectorAll('.edgePath').forEach(function(el) {
    var rawId = el.getAttribute('id') || '';
    var path = el.querySelector('path');
    if (!path) return;
    // Extract source_target from ID pattern: L_Source_Target_0 or L-Source-Target-0
    var edgeMatch = rawId.match(/L[-_](.+?)[-_](.+?)[-_]\\d+$/);
    var edgeId = rawId;
    if (edgeMatch) {
      edgeId = 'edge-' + edgeMatch[1] + '-' + edgeMatch[2];
    }
    el.setAttribute('data-edge-id', edgeId);
    edgeMap[edgeId] = { group: el, path: path };
  });

  // Build a flexible edge lookup that matches by source-target substring
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

  // ---- 3. Set initial state ----
  Object.keys(nodeMap).forEach(function(nid) {
    nodeMap[nid].style.opacity = '0.4';
  });
  Object.keys(edgeMap).forEach(function(eid) {
    var p = edgeMap[eid].path;
    var len = p.getTotalLength ? p.getTotalLength() : 300;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.style.opacity = '0.2';
  });

  // ---- 4. Annotation panel ----
  var annotEl = document.getElementById('soom-annotations');

  function setAnnotation(step) {
    if (!annotEl) return;
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
      annotEl.textContent = 'Simultaneously: ' + texts.join(', ');
    } else {
      annotEl.textContent = texts.join(', ');
    }
    annotEl.style.opacity = '1';
  }

  // ---- 5. Create flow particle ----
  var svgNS = 'http://www.w3.org/2000/svg';

  function createParticle(pathEl, duration, onDone) {
    var circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('r', '4');
    circle.classList.add('soom-flow-particle');
    svgEl.appendChild(circle);

    var len = pathEl.getTotalLength ? pathEl.getTotalLength() : 300;
    var start = performance.now();

    function tick(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      var pt = pathEl.getPointAtLength(eased * len);
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        circle.remove();
        if (onDone) onDone();
      }
    }
    requestAnimationFrame(tick);
  }

  // ---- 6. Step execution ----
  var currentStepIndex = -1;
  var paused = false;
  var speedMultiplier = 1;
  var activeAnimations = [];

  function applyStepState(stepIdx) {
    // Apply all states up to stepIdx (for goToStep)
    // Reset everything first
    Object.keys(nodeMap).forEach(function(nid) {
      nodeMap[nid].style.opacity = '0.4';
      nodeMap[nid].classList.remove('soom-node-active', 'soom-node-completed');
    });
    Object.keys(edgeMap).forEach(function(eid) {
      var p = edgeMap[eid].path;
      var len = p.getTotalLength ? p.getTotalLength() : 300;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.style.opacity = '0.2';
    });

    // Apply completed states for all steps before stepIdx
    for (var i = 0; i < stepIdx; i++) {
      var s = steps[i];
      if (s.activateEdges) s.activateEdges.forEach(function(eid) {
        // Find edge by matching edge IDs from sequence against discovered edges
        var found = null;
        for (var k in edgeMap) { if (k.indexOf(eid.replace('edge-', '')) !== -1 || k === eid) { found = edgeMap[k]; break; } }
        if (!found) {
          // Try matching by index
          var idx = parseInt(eid.replace('edge-', ''));
          var keys = Object.keys(edgeMap);
          if (!isNaN(idx) && idx < keys.length) found = edgeMap[keys[idx]];
        }
        if (found) {
          found.path.style.strokeDashoffset = '0';
          found.path.style.opacity = '1';
        }
      });
      if (s.activateNodes) s.activateNodes.forEach(function(nid) {
        if (nodeMap[nid]) {
          nodeMap[nid].style.opacity = '0.8';
          nodeMap[nid].classList.remove('soom-node-active');
          nodeMap[nid].classList.add('soom-node-completed');
        }
      });
    }
  }

  function resolveEdge(eid) {
    // Try direct match first
    if (edgeMap[eid]) return edgeMap[eid];
    // Try matching by source-target from EDGE_INFO
    var info = EDGE_INFO[eid];
    if (info) {
      var found = findEdgeBySourceTarget(info.source, info.target);
      if (found) return found;
    }
    // Try matching by index
    var idx = parseInt(eid.replace('edge-', ''));
    var keys = Object.keys(edgeMap);
    if (!isNaN(idx) && idx < keys.length) return edgeMap[keys[idx]];
    return null;
  }

  function playStep(stepIdx, onDone) {
    if (stepIdx >= steps.length) {
      if (annotEl) {
        annotEl.textContent = 'Animation complete';
        setTimeout(function() { annotEl.style.opacity = '0.5'; }, 2000);
      }
      return;
    }
    currentStepIndex = stepIdx;
    var step = steps[stepIdx];
    var duration = (step.duration || 800) / speedMultiplier;

    setAnnotation(step);

    var pending = 0;
    function checkDone() {
      pending--;
      if (pending <= 0 && !paused) {
        // Transition active nodes to completed
        if (step.activateNodes) step.activateNodes.forEach(function(nid) {
          if (nodeMap[nid]) {
            nodeMap[nid].classList.remove('soom-node-active');
            nodeMap[nid].classList.add('soom-node-completed');
            nodeMap[nid].style.opacity = '0.8';
          }
        });
        setTimeout(function() { if (!paused && onDone) onDone(); }, 200);
      }
    }

    // Activate nodes
    if (step.activateNodes) step.activateNodes.forEach(function(nid) {
      if (nodeMap[nid]) {
        nodeMap[nid].style.opacity = '1';
        nodeMap[nid].classList.add('soom-node-active');
      }
    });

    // Animate edges
    if (step.activateEdges && step.activateEdges.length > 0) {
      step.activateEdges.forEach(function(eid) {
        var edge = resolveEdge(eid);
        if (!edge) return;
        var pathEl = edge.path;
        var len = pathEl.getTotalLength ? pathEl.getTotalLength() : 300;

        pending++;
        pathEl.style.opacity = '1';

        // Edge draw: animate stroke-dashoffset from len to 0
        var anim = anime.animate(pathEl, {
          strokeDashoffset: [len, 0],
          duration: duration,
          ease: 'inOutQuad',
          onComplete: checkDone,
        });
        activeAnimations.push(anim);

        // Flow particle
        createParticle(pathEl, duration);
      });
    }

    // If no edges to animate, just wait for duration then proceed
    if (!step.activateEdges || step.activateEdges.length === 0) {
      pending = 1;
      setTimeout(checkDone, duration);
    }
  }

  // ---- 7. Playback control ----
  function startSequence() {
    playStep(0, function next() {
      playStep(currentStepIndex + 1, next);
    });
  }

  window.soomAnimation = {
    play: function() {
      paused = false;
      if (currentStepIndex < 0) {
        startSequence();
      } else {
        playStep(currentStepIndex, function next() {
          playStep(currentStepIndex + 1, next);
        });
      }
    },
    pause: function() {
      paused = true;
      activeAnimations.forEach(function(a) { if (a && a.pause) a.pause(); });
    },
    stepForward: function() {
      if (currentStepIndex < steps.length - 1) {
        applyStepState(currentStepIndex + 1);
        currentStepIndex = currentStepIndex + 1;
        if (steps[currentStepIndex]) setAnnotation(steps[currentStepIndex]);
      }
    },
    stepBackward: function() {
      if (currentStepIndex > 0) {
        applyStepState(currentStepIndex - 1);
        currentStepIndex = currentStepIndex - 1;
        if (steps[currentStepIndex]) setAnnotation(steps[currentStepIndex]);
      }
    },
    goToStep: function(n) {
      if (n >= 0 && n < steps.length) {
        paused = true;
        applyStepState(n);
        currentStepIndex = n;
        if (steps[n]) setAnnotation(steps[n]);
      }
    },
    reset: function() {
      paused = true;
      currentStepIndex = -1;
      activeAnimations = [];
      applyStepState(0);
      if (annotEl) { annotEl.textContent = ''; annotEl.style.opacity = '0'; }
    },
    setSpeed: function(multiplier) {
      speedMultiplier = multiplier || 1;
    },
    get currentStep() { return currentStepIndex; },
    get totalSteps() { return steps.length; },
  };

  // Auto-play on load
  setTimeout(startSequence, 500);
})();`;
}
