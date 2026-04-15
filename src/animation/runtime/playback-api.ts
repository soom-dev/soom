export function buildPlaybackApiJs(): string {
  return `
  function getCurrentStepIndex() {
    var t = timeline.currentTime;
    for (var i = stepOffsets.length - 1; i >= 0; i--) {
      if (t >= stepOffsets[i]) return i;
    }
    return -1;
  }

  function seekToStep(n) {
    resetPersistentEffects();
    timeline.seek(stepEndOffsets[n], true);

    for (var i = 0; i <= n && i < steps.length; i++) {
      var s = steps[i];
      if (s.activateNodes) s.activateNodes.forEach(function(nid) {
        if (nodeMap[nid]) {
          nodeMap[nid].classList.add('soom-node-completed');
        }
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
          edge.path.classList.add('soom-edge-completed');
          startMarchingLine(edge.path);
        }
      });
    }

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
    get currentStep() { return getCurrentStepIndex() + 1; },
    get totalSteps() { return steps.length; },
    get progress() { return timeline.progress; },
  };

  setTimeout(function() { timeline.play(); }, 500);`;
}
