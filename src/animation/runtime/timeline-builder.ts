export function buildTimelineJs(): string {
  return `
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

  // Store original node Y positions for lift animation
  var nodeOrigY = {};
  var nodeLift = {};
  Object.keys(nodeMap).forEach(function(nid) {
    var t = nodeMap[nid].getAttribute('transform') || '';
    var m = t.match(/translate\\(([\\d.]+),\\s*([\\d.]+)\\)/);
    if (m) {
      var x = parseFloat(m[1]);
      var y = parseFloat(m[2]);
      nodeOrigY[nid] = { x: x, y: y };
      nodeLift[nid] = { lift: 0 };
    }
  });

  function applyLift(nid) {
    var orig = nodeOrigY[nid];
    var lift = nodeLift[nid];
    if (orig && lift) {
      nodeMap[nid].setAttribute('transform', 'translate(' + orig.x + ', ' + (orig.y + lift.lift) + ')');
    }
  }

  // Initial state via timeline.set() — seekable source of truth
  Object.keys(nodeMap).forEach(function(nid) {
    timeline.set(nodeMap[nid], { opacity: 0.4 }, 0);
    var initShape = nodeMap[nid].querySelector('rect, polygon, circle, ellipse');
    if (initShape) {
      timeline.set(initShape, { filter: 'drop-shadow(2px 3px 4px var(--soom-shadow-rest))' }, 0);
    }
    if (nodeLift[nid]) {
      timeline.set(nodeLift[nid], { lift: 0 }, 0);
    }
  });
  Object.keys(edgeMap).forEach(function(eid) {
    timeline.set(edgeMap[eid].path, { strokeDashoffset: edgeTotalLens[eid] || 300, opacity: 0.2 }, 0);
  });
  allEdgeLabels.forEach(function(el) {
    timeline.set(el, { opacity: 0 }, 0);
  });

  // Idle gap before first step (step 0 = idle)
  var idleGap = 500;
  var idleDummy = { v: 0 };
  timeline.add(idleDummy, { v: 1, duration: idleGap }, 0);
  var offset = idleGap;

  steps.forEach(function(step, idx) {
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
    stepEndOffsets.push(offset + stepDuration + 399);

    timeline.call(function() { setAnnotation(step); }, offset);

    var activatedInStep = {};

    if (step.activateNodes) step.activateNodes.forEach(function(nid) {
      if (!nodeMap[nid]) return;
      activatedInStep[nid] = true;
      var fromOpacity = nodeActivated[nid] ? 0.85 : 0.4;
      nodeActivated[nid] = true;
      timeline.add(nodeMap[nid], { opacity: [fromOpacity, 1], duration: 150 }, offset);
      timeline.call(function() {
        nodeMap[nid].classList.add('soom-node-active');
      }, offset);
      // Shadow elevation: node rises on activate
      var actShape = nodeMap[nid].querySelector('rect, polygon, circle, ellipse');
      if (actShape) {
        timeline.add(actShape, {
          filter: ['drop-shadow(2px 3px 4px var(--soom-shadow-rest))', 'drop-shadow(4px 8px 12px var(--soom-shadow-active))'],
          duration: 150,
        }, offset);
      }
      // Lift node via SVG transform offset
      if (nodeLift[nid]) {
        (function(id) {
          timeline.add(nodeLift[id], { lift: [0, -5], duration: 150, onRender: function() { applyLift(id); } }, offset);
        })(nid);
      }
    });

    if (step.activateEdges && step.activateEdges.length > 0) {
      step.activateEdges.forEach(function(eid) {
        var edge = resolveEdge(eid);
        if (!edge) return;
        var pathEl = edge.path;
        var info = EDGE_INFO[eid];
        var targetNodeId = info ? info.target : null;

        var pathLen = pathEl.getTotalLength ? pathEl.getTotalLength() : 300;
        var duration = edgeDurations[eid] || (pathLen < 150 ? 700 : Math.max(400, Math.min(Math.round(pathLen * 3), 1200)));
        var easing = pathLen < 150 ? 'spring(1, 80, 10, 0)' : 'inOutQuad';
        edgeTimingMap[eid] = { offset: offset, duration: duration };

        var totalLen = edgeTotalLens[eid] || pathLen;
        timeline.add(pathEl, { strokeDashoffset: [totalLen, 0], duration: duration, ease: easing }, offset);
        timeline.add(pathEl, { opacity: [0.2, 1], duration: duration }, offset);

        (function(p, eid2) {
          timeline.call(function() {
            if (p._origMarkerEnd) p.style.markerEnd = p._origMarkerEnd;
            if (p._origMarkerStart) p.style.markerStart = p._origMarkerStart;
            p.classList.add('soom-edge-completed');
            startMarchingLine(p);
          }, offset + duration);
        })(pathEl, eid);

        var edgeLabelEl = pathToLabelMap.get(pathEl);
        if (edgeLabelEl && !edgeLabelEl.textContent.trim()) edgeLabelEl = null;
        if (edgeLabelEl) {
          timeline.add(edgeLabelEl, { opacity: [0, 1], duration: 200 }, offset + duration);
        }

        if (targetNodeId && nodeMap[targetNodeId] && !activatedInStep[targetNodeId]) {
          activatedInStep[targetNodeId] = true;
          var tFromOpacity = nodeActivated[targetNodeId] ? 0.85 : 0.4;
          nodeActivated[targetNodeId] = true;
          (function(nid, fromOp) {
            timeline.add(nodeMap[nid], { opacity: [fromOp, 1], duration: 150 }, offset + duration);
            timeline.call(function() {
              nodeMap[nid].classList.add('soom-node-active');
            }, offset + duration);
            // Shadow elevation on target node activate
            var tgtShape = nodeMap[nid].querySelector('rect, polygon, circle, ellipse');
            if (tgtShape) {
              timeline.add(tgtShape, {
                filter: ['drop-shadow(2px 3px 4px var(--soom-shadow-rest))', 'drop-shadow(4px 8px 12px var(--soom-shadow-active))'],
                duration: 150,
              }, offset + duration);
            }
            if (nodeLift[nid]) {
              timeline.add(nodeLift[nid], { lift: [0, -5], duration: 150, onRender: function() { applyLift(nid); } }, offset + duration);
            }
          })(targetNodeId, tFromOpacity);
        }
      });
    }

    var completeOffset = offset + stepDuration + 200;
    var nodesInStep = Object.keys(activatedInStep);

    nodesInStep.forEach(function(nid) {
      if (!nodeMap[nid]) return;
      timeline.add(nodeMap[nid], { opacity: [1, 0.85], duration: 200 }, completeOffset);
      timeline.call(function() {
        nodeMap[nid].classList.remove('soom-node-active');
        nodeMap[nid].classList.add('soom-node-completed');
      }, completeOffset);
      // Settle shadow: shrink back from active elevation
      var settleShape = nodeMap[nid].querySelector('rect, polygon, circle, ellipse');
      if (settleShape) {
        timeline.add(settleShape, {
          filter: ['drop-shadow(4px 8px 12px var(--soom-shadow-active))', 'drop-shadow(2px 4px 6px var(--soom-shadow-completed))'],
          duration: 200, ease: 'outQuad',
        }, completeOffset);
      }
      // Settle: node lowers back
      if (nodeLift[nid]) {
        (function(id) {
          timeline.add(nodeLift[id], { lift: [-5, 0], duration: 200, ease: 'outQuad', onRender: function() { applyLift(id); } }, completeOffset);
        })(nid);
      }
    });

    if (!step.activateEdges || step.activateEdges.length === 0) {
      var dummy = { v: 0 };
      timeline.add(dummy, { v: 1, duration: stepDuration }, offset);
    }

    offset = completeOffset + 200;
  });

  var endHold = { v: 0 };
  timeline.add(endHold, { v: 1, duration: 2000 }, offset);`;
}
