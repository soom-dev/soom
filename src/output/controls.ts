export function buildControlsHtml(): string {
  return `
  <div class="soom-controls" id="soom-controls" role="toolbar" aria-label="Playback controls">
    <button class="soom-ctrl-btn" id="soom-step-back" aria-label="Step back" title="Step back (\u2190)">&#x23EE;</button>
    <button class="soom-ctrl-btn" id="soom-play-pause" aria-label="Play" title="Play/Pause (Space)">&#x25B6;</button>
    <button class="soom-ctrl-btn" id="soom-step-fwd" aria-label="Step forward" title="Step forward (\u2192)">&#x23ED;</button>
    <input id="soom-scrubber" type="range" min="0" max="0" value="0" step="1" aria-label="Timeline scrubber">
    <span id="soom-step-counter">\u2014</span>
    <button class="soom-ctrl-btn" id="soom-speed" aria-label="Playback speed" title="Cycle speed">1&#xD7;</button>
    <button class="soom-ctrl-btn" id="soom-loop" aria-label="Loop toggle" title="Toggle loop" aria-pressed="false">&#x1F501;</button>
    <button class="soom-ctrl-btn" id="soom-help" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">?</button>
    <button class="soom-ctrl-btn" id="soom-fullscreen" aria-label="Fullscreen" title="Fullscreen (F)">&#x26F6;</button>
  </div>
  <div class="soom-help-modal" id="soom-help-modal" role="dialog" aria-modal="true" aria-labelledby="soom-help-title" aria-hidden="true">
    <div class="soom-help-modal-card">
      <h2 id="soom-help-title" class="soom-help-modal-title">Keyboard shortcuts</h2>
      <dl class="soom-help-modal-list">
        <dt><kbd>Space</kbd></dt><dd>Play / pause</dd>
        <dt><kbd>\u2190</kbd> <kbd>\u2192</kbd></dt><dd>Step backward / forward</dd>
        <dt><kbd>F</kbd></dt><dd>Toggle fullscreen</dd>
        <dt><kbd>?</kbd></dt><dd>Show this help</dd>
        <dt><kbd>Esc</kbd></dt><dd>Close help</dd>
      </dl>
      <button class="soom-ctrl-btn soom-help-modal-close" id="soom-help-close" aria-label="Close help">&#x2716;</button>
    </div>
  </div>`;
}

export function buildControlsScript(): string {
  return `
(function() {
  'use strict';

  var controls = document.getElementById('soom-controls');
  if (!controls) return;

  var MAX_WAIT = 20;
  var waited = 0;
  function init() {
    if (typeof window.soomAnimation === 'undefined') {
      if (waited++ < MAX_WAIT) setTimeout(init, 100);
      return;
    }
    var api = window.soomAnimation;
    var btnStepBack = document.getElementById('soom-step-back');
    var btnPlayPause = document.getElementById('soom-play-pause');
    var btnStepFwd = document.getElementById('soom-step-fwd');
    var scrubber = document.getElementById('soom-scrubber');
    var stepCounter = document.getElementById('soom-step-counter');
    var btnSpeed = document.getElementById('soom-speed');
    var btnLoop = document.getElementById('soom-loop');
    var btnHelp = document.getElementById('soom-help');
    var btnFullscreen = document.getElementById('soom-fullscreen');
    var helpModal = document.getElementById('soom-help-modal');
    var helpClose = document.getElementById('soom-help-close');
    var helpInvoker = null;

    var speeds = [0.5, 1, 2, 4];
    var speedIdx = 1;
    var isPlaying = true;
    // Loop default is OFF; user choice persists under 'soom-loop' alongside
    // the existing 'soom-theme' key. Hydrate from storage so the UI reflects
    // whatever the timeline already booted with.
    var loopEnabled = false;
    try {
      loopEnabled = localStorage.getItem('soom-loop') === '1';
    } catch (_) { /* sandboxed iframe / file:// in some browsers */ }
    var scrubbingActive = false;
    var totalSteps = api.totalSteps;

    // Empty sequence — disable step controls, show placeholder, lock scrubber
    if (totalSteps === 0) {
      if (scrubber) { scrubber.max = '0'; scrubber.disabled = true; }
      if (stepCounter) stepCounter.textContent = '\u2014';
      if (btnStepBack) btnStepBack.disabled = true;
      if (btnStepFwd) btnStepFwd.disabled = true;
    } else {
      if (scrubber) scrubber.max = String(totalSteps); // 0=idle, 1..N=action steps
    }

    function updatePlayPause() {
      if (!btnPlayPause) return;
      btnPlayPause.innerHTML = isPlaying ? '&#x23F8;' : '&#x25B6;'; // safe: hardcoded HTML entity literals
      btnPlayPause.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }

    function updateScrubber() {
      if (totalSteps === 0) return;
      var cur = api.currentStep;
      if (scrubber && !scrubbingActive) scrubber.value = String(cur);
      if (stepCounter) stepCounter.textContent = cur + '/' + totalSteps;
    }

    (function rafLoop() {
      updateScrubber();
      requestAnimationFrame(rafLoop);
    })();

    function flashSeek() {
      document.body.classList.remove('soom-seeking');
      void document.body.offsetWidth; // force reflow to restart animation
      document.body.classList.add('soom-seeking');
    }

    if (btnStepBack) btnStepBack.addEventListener('click', function() {
      isPlaying = false;
      updatePlayPause();
      flashSeek();
      api.stepBackward();
    });

    if (btnPlayPause) btnPlayPause.addEventListener('click', function() {
      if (isPlaying) { api.pause(); isPlaying = false; showControls(); }
      else { api.play(); isPlaying = true; showControls(); }
      updatePlayPause();
    });

    if (btnStepFwd) btnStepFwd.addEventListener('click', function() {
      isPlaying = false;
      updatePlayPause();
      flashSeek();
      api.stepForward();
    });

    if (scrubber) {
      scrubber.addEventListener('mousedown', function() { scrubbingActive = true; });
      scrubber.addEventListener('touchstart', function() { scrubbingActive = true; }, { passive: true });
      scrubber.addEventListener('input', function() {
        var n = parseInt(scrubber.value, 10);
        flashSeek();
        api.goToStep(n);
        if (stepCounter) stepCounter.textContent = n + '/' + totalSteps;
      });
      scrubber.addEventListener('mouseup', function() { scrubbingActive = false; });
      scrubber.addEventListener('touchend', function() { scrubbingActive = false; }, { passive: true });
    }

    if (btnSpeed) btnSpeed.addEventListener('click', function() {
      speedIdx = (speedIdx + 1) % speeds.length;
      var s = speeds[speedIdx];
      api.setSpeed(s);
      btnSpeed.textContent = (s === 0.5 ? '0.5' : String(s)) + '\u00D7';
    });

    // anime.js v4 consumes the construction-time loop param into
    // iterationCount (true -> Infinity, false -> 1). Assigning to the
    // side-channel .loop after construction keeps onComplete coherent, but
    // the tick loop only respects iterationCount -- set both so the toggle
    // takes effect mid-flight, not just on the next page reload.
    function syncLoopState(on) {
      api.timeline.loop = on;
      api.timeline.iterationCount = on ? Infinity : 1;
    }
    syncLoopState(loopEnabled);

    if (btnLoop) {
      btnLoop.classList.toggle('soom-ctrl-active', loopEnabled);
      btnLoop.setAttribute('aria-pressed', String(loopEnabled));
      btnLoop.addEventListener('click', function() {
        loopEnabled = !loopEnabled;
        syncLoopState(loopEnabled);
        btnLoop.classList.toggle('soom-ctrl-active', loopEnabled);
        btnLoop.setAttribute('aria-pressed', String(loopEnabled));
        try {
          localStorage.setItem('soom-loop', loopEnabled ? '1' : '0');
        } catch (_) { /* sandboxed iframe / file:// in some browsers */ }
      });
    }

    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', function() {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(function() {});
        } else {
          document.exitFullscreen().catch(function() {});
        }
      });
      document.addEventListener('fullscreenchange', function() {
        if (btnFullscreen) btnFullscreen.innerHTML = document.fullscreenElement ? '&#x2716;' : '&#x26F6;'; // safe: hardcoded HTML entity literals
      });
    }

    // Help modal — keyboard-driven (? to open, Esc / backdrop click / X to
    // close). Pre-rendered in the DOM so the open/close path is just a class
    // toggle; aria-hidden flips for AT. Focus is trapped to the close button
    // (currently the only focusable child) and restored to the invoking
    // element on dismissal so keyboard users don't lose their place.
    function isHelpOpen() {
      return !!helpModal && helpModal.classList.contains('soom-help-open');
    }
    function openHelp() {
      if (!helpModal || isHelpOpen()) return;
      helpInvoker = document.activeElement;
      helpModal.classList.add('soom-help-open');
      helpModal.setAttribute('aria-hidden', 'false');
      if (helpClose) helpClose.focus();
    }
    function closeHelp() {
      if (!helpModal || !isHelpOpen()) return;
      helpModal.classList.remove('soom-help-open');
      helpModal.setAttribute('aria-hidden', 'true');
      if (helpInvoker && typeof helpInvoker.focus === 'function') helpInvoker.focus();
      helpInvoker = null;
    }
    if (btnHelp) btnHelp.addEventListener('click', openHelp);
    if (helpClose) helpClose.addEventListener('click', closeHelp);
    if (helpModal) helpModal.addEventListener('click', function(e) {
      if (e.target === helpModal) closeHelp();
    });
    if (helpModal) helpModal.addEventListener('keydown', function(e) {
      // Focus trap — keep Tab cycling among the modal's focusables. Currently
      // there is only one (the close button) but the loop is general so the
      // contract holds if more affordances land in the modal later.
      if (e.code !== 'Tab') return;
      var focusables = helpModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) { e.preventDefault(); return; }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    document.addEventListener('keydown', function(e) {
      // Help-modal shortcuts run before anything else so '?' / Esc work
      // regardless of focus location, and so other shortcuts are swallowed
      // while the modal is open (the modal is modal).
      if (e.code === 'Escape' && isHelpOpen()) {
        e.preventDefault(); closeHelp(); return;
      }
      if (e.key === '?') {
        e.preventDefault();
        if (isHelpOpen()) closeHelp(); else openHelp();
        return;
      }
      if (isHelpOpen()) return;

      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) { api.pause(); isPlaying = false; showControls(); }
        else { api.play(); isPlaying = true; showControls(); }
        updatePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        isPlaying = false; updatePlayPause(); flashSeek(); api.stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        isPlaying = false; updatePlayPause(); flashSeek(); api.stepBackward();
      } else if (e.code === 'KeyF') {
        if (btnFullscreen) btnFullscreen.click();
      }
    });

    var hideTimer = null;
    function showControls() {
      controls.style.opacity = '1';
      controls.style.pointerEvents = 'auto';
      document.body.classList.remove('soom-controls-hidden');
      clearTimeout(hideTimer);
      // Keep controls visible while paused
      if (!isPlaying) return;
      hideTimer = setTimeout(function() {
        controls.style.opacity = '0';
        controls.style.pointerEvents = 'none';
        document.body.classList.add('soom-controls-hidden');
      }, 3000);
    }
    showControls();
    document.addEventListener('mousemove', showControls);
    document.addEventListener('touchstart', showControls, { passive: true });
    controls.addEventListener('mouseenter', function() {
      clearTimeout(hideTimer);
      controls.style.opacity = '1';
      controls.style.pointerEvents = 'auto';
    });
    controls.addEventListener('mouseleave', showControls);

    // Sync play button when animation completes without looping
    api.timeline.onComplete = function() {
      if (!api.timeline.loop) { isPlaying = false; updatePlayPause(); }
    };

    updatePlayPause();
    updateScrubber();
  }

  init();
})();`;
}
