import { HANSOOM_VIEWBOX, HANGUL_VIEWBOX } from './paths.js';

export function buildWatermarkScript(): string {
  return `
document.addEventListener('DOMContentLoaded', function() {
  var enSvg = document.querySelector('.soom-wm-en');
  var krSvg = document.querySelector('.soom-wm-kr');
  var enChars = enSvg.querySelectorAll('.soom-wm-char');
  var krChars = krSvg.querySelectorAll('.soom-wm-char');

  function drawGroup(chars, svgEl, viewBox, speed, onDone) {
    svgEl.setAttribute('viewBox', viewBox);
    svgEl.style.display = '';
    var drawDur = Math.round(2000 / speed);
    var eraseDur = Math.round(1500 / speed);
    var staggerMs = Math.round(100 / speed);
    var holdMs = Math.round(1000 / speed);
    var drawables = anime.svg.createDrawable(chars);
    anime.animate(drawables, {
      draw: '0 1',
      ease: 'inOutQuad',
      duration: drawDur,
      delay: anime.stagger(staggerMs),
      onComplete: function() {
        setTimeout(function() {
          var drawables2 = anime.svg.createDrawable(chars);
          anime.animate(drawables2, {
            draw: ['0 1', '1 1'],
            ease: 'inOutQuad',
            duration: eraseDur,
            delay: anime.stagger(staggerMs),
            onComplete: function() {
              svgEl.style.display = 'none';
              setTimeout(onDone, 500);
            }
          });
        }, holdMs);
      }
    });
  }

  var pulseAnim = null;
  var isHovered = false;
  var strokeColor = '';

  function startPulse() {
    pulseAnim = anime.animate(enSvg, {
      filter: [
        'drop-shadow(0 0 4px ' + strokeColor + ')',
        'drop-shadow(0 0 28px ' + strokeColor + ')',
      ],
      opacity: [1, 0.5],
      duration: 1500,
      ease: 'inOutSine',
      loop: true,
      alternate: true,
    });
  }

  function startGlowPulse() {
    enSvg.style.display = '';
    strokeColor = getComputedStyle(enChars[0]).stroke || '#00d4ff';
    var drawables = anime.svg.createDrawable(enChars);

    var glowStarted = false;
    anime.animate(drawables, {
      draw: '0 1',
      ease: 'inOutQuad',
      duration: 2000,
      delay: anime.stagger(100),
      onRender: function(anim) {
        // At 90% progress, begin the glow crossfade into the pulse
        if (!glowStarted && anim.currentTime > 1800) {
          glowStarted = true;
          anime.animate(enChars, {
            fill: strokeColor,
            fillOpacity: [0, 0.15],
            duration: 1200,
            ease: 'out(3)',
          });
          anime.animate(enSvg, {
            filter: ['drop-shadow(0 0 0px ' + strokeColor + ')', 'drop-shadow(0 0 16px ' + strokeColor + ')'],
            duration: 1200,
            ease: 'out(3)',
          });
        }
      },
      onComplete: function() {
        startPulse();
      },
    });
  }

  // Hover: fast transition to peak brightness, fill characters fully L-to-R
  enSvg.parentElement.addEventListener('mouseenter', function() {
    if (!strokeColor || isHovered) return;
    isHovered = true;
    if (pulseAnim) { pulseAnim.pause(); }
    // Fast transition to peak glow (not instant)
    anime.animate(enSvg, {
      filter: 'drop-shadow(0 0 28px ' + strokeColor + ')',
      opacity: 1,
      duration: 500,
      ease: 'out(2)',
    });
    // Fill characters fully, left-to-right stagger
    anime.animate(enChars, {
      fill: strokeColor,
      fillOpacity: 1,
      duration: 600,
      delay: anime.stagger(60),
      ease: 'inOutQuad',
    });
  });

  enSvg.parentElement.addEventListener('mouseleave', function() {
    if (!isHovered) return;
    isHovered = false;
    // Fade fill back to outline level
    anime.animate(enChars, {
      fillOpacity: 0.15,
      duration: 600,
      ease: 'inOutQuad',
      onComplete: function() {
        // Restart the pulse fresh after fill fades
        if (!isHovered) { startPulse(); }
      },
    });
  });

  // Sequence: draw EN → erase → draw KR (slow) → erase → final EN draw with glow
  drawGroup(enChars, enSvg, '${HANSOOM_VIEWBOX}', 1, function() {
    drawGroup(krChars, krSvg, '${HANGUL_VIEWBOX}', 0.5, startGlowPulse);
  });
});`;
}
