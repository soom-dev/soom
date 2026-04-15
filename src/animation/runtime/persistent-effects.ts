export function buildPersistentEffectsJs(): string {
  return `
  var marchAnimations = [];
  var hoverAnimations = [];
  var focusLoops = [];
  var focusParticles = [];

  function stopFocusLoops() {
    focusLoops.forEach(function(a) { if (a) a.revert(); });
    focusLoops = [];
    focusParticles.forEach(function(el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    focusParticles = [];
  }

  function resetPersistentEffects() {
    stopFocusLoops();
    marchAnimations.forEach(function(a) { if (a) a.revert(); });
    marchAnimations = [];
    Object.keys(edgeMap).forEach(function(eid) {
      var p = edgeMap[eid].path;
      p.style.removeProperty('stroke-dasharray');
      p.style.removeProperty('stroke-width');
    });
    hoverAnimations.forEach(function(a) { if (a) a.revert(); });
    hoverAnimations = [];
    Object.keys(nodeMap).forEach(function(nid) {
      nodeMap[nid].classList.remove('soom-node-active', 'soom-node-completed');
      // Reset lift to 0 and restore original transform
      if (nodeLift[nid]) { nodeLift[nid].lift = 0; applyLift(nid); }
    });
    Object.keys(edgeMap).forEach(function(eid) {
      edgeMap[eid].path.classList.remove('soom-edge-completed');
      edgeMap[eid].path.style.markerEnd = 'none';
      edgeMap[eid].path.style.markerStart = 'none';
    });
    if (annotAnim) annotAnim.opacity(0);
    if (annotEl) {
      while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
    }
  }

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
      if (currentTime < timing.offset) return;
      if (currentTime >= timing.offset + timing.duration) return;

      activeEdgeIds.push(eid);
      var edge = resolveEdge(eid);
      if (!edge) return;
      var pathEl = edge.path;
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

    if (activeEdgeIds.length > 0) {
      setPauseAnnotation(activeEdgeIds);
    }
  }

  function startHoverFloat(nid) {
    if (!nodeLift[nid] || !nodeOrigY[nid]) return;
    var anim = anime.animate(nodeLift[nid], {
      lift: [-3, -7],
      duration: 1200,
      loop: true,
      alternate: true,
      ease: 'inOutSine',
      composition: 'none',
      onRender: function() { applyLift(nid); },
    });
    hoverAnimations.push(anim);
  }

  function startMarchingLine(pathEl) {
    var baseWidth = parseFloat(pathEl.getAttribute('stroke-width') || '1');
    pathEl.style.strokeWidth = String(baseWidth * 1.5);
    pathEl.style.strokeDasharray = marchDash + ' ' + marchGap;
    var anim = anime.animate(pathEl, {
      strokeDashoffset: [0, -marchRepeat],
      loop: true,
      duration: Math.round(marchRepeat / medianEdgeLen * 3000),
      ease: 'linear',
      composition: 'none',
    });
    marchAnimations.push(anim);
  }`;
}
