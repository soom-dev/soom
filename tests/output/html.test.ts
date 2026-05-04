import { describe, it, expect } from 'bun:test';
import { renderHtml } from '../../src/output/html.js';
import { buildControlsHtml, buildControlsScript } from '../../src/output/controls.js';

describe('HTML Renderer', () => {
  it('should produce a valid HTML document', async () => {
    const svg = '<svg><text>Hello</text></svg>';
    const html = await renderHtml(svg, 'dark');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('should use dark theme by default', async () => {
    const html = await renderHtml('<svg></svg>');
    expect(html).toContain('class="soom-dark"');
    expect(html).toContain('#1E2A3A');
  });

  it('should use light theme when specified', async () => {
    const html = await renderHtml('<svg></svg>', 'light');
    expect(html).toContain('class="soom-light"');
    expect(html).toContain('#F8F6FF');
  });

  it('should include viewport meta tag', async () => {
    const html = await renderHtml('<svg></svg>');
    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width');
  });

  it('should be self-contained with no external resources', async () => {
    const html = await renderHtml('<svg></svg>');
    // Watermark <a> link to hansoom.dev is intentional, not a resource
    expect(html).not.toContain('src="http');
    expect(html).not.toMatch(/<link[^>]*href="https?:\/\//);
  });

  it('should include Content-Security-Policy meta tag', async () => {
    const html = await renderHtml('<svg></svg>');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'none'");
  });

  it('should sanitize dangerous SVG content', async () => {
    const maliciousSvg = '<svg><script>alert("xss")</script><text>Safe</text></svg>';
    const html = await renderHtml(maliciousSvg);
    // The XSS payload should be stripped from the diagram SVG
    expect(html).not.toContain('alert("xss")');
    expect(html).toContain('Safe');
  });
});

describe('Playback Controls', () => {
  const animationData = {
    sequenceJson: '{"steps":[]}',
    animationScript: '/* anim */',
  };

  it('should include control bar element in animated output', async () => {
    const html = await renderHtml('<svg></svg>', 'dark', animationData);
    expect(html).toContain('id="soom-controls"');
  });

  it('should not include control bar element in static (no animation) output', async () => {
    const html = await renderHtml('<svg></svg>', 'dark');
    expect(html).not.toContain('id="soom-controls"');
  });

  it('buildControlsHtml: should contain all required buttons', () => {
    const html = buildControlsHtml();
    expect(html).toContain('soom-step-back');
    expect(html).toContain('soom-play-pause');
    expect(html).toContain('soom-step-fwd');
    expect(html).toContain('soom-speed');
    expect(html).toContain('soom-loop');
    expect(html).toContain('soom-fullscreen');
  });

  it('buildControlsHtml: scrubber is a range input', () => {
    const html = buildControlsHtml();
    expect(html).toContain('type="range"');
    expect(html).toContain('id="soom-scrubber"');
  });

  it('buildControlsHtml: step counter element is present', () => {
    const html = buildControlsHtml();
    expect(html).toContain('id="soom-step-counter"');
  });

  it('buildControlsScript: keyboard handler is registered', () => {
    const script = buildControlsScript();
    expect(script).toContain('keydown');
    expect(script).toContain("e.code === 'Space'");
    expect(script).toContain("e.code === 'ArrowRight'");
    expect(script).toContain("e.code === 'ArrowLeft'");
    expect(script).toContain("e.code === 'KeyF'");
  });

  it('buildControlsScript: auto-hide timer is present', () => {
    const script = buildControlsScript();
    expect(script).toContain('hideTimer');
    expect(script).toContain('3000');
    expect(script).toContain('mousemove');
    expect(script).toContain('touchstart');
  });

  it('buildControlsScript: wires all soomAnimation API methods', () => {
    const script = buildControlsScript();
    expect(script).toContain('api.play()');
    expect(script).toContain('api.pause()');
    expect(script).toContain('api.stepForward()');
    expect(script).toContain('api.stepBackward()');
    expect(script).toContain('api.goToStep');
    expect(script).toContain('api.setSpeed');
    expect(script).toContain('api.timeline.loop');
  });

  describe('Focus indicators + help modal (a11y)', () => {
    it('base CSS: defines :focus-visible outlines for all interactive affordances', async () => {
      const { baseCss } = await import('../../src/themes/base.js');
      // One block covers all four selectors so the keyboard ring reads as one consistent surface.
      expect(baseCss).toContain('.soom-ctrl-btn:focus-visible');
      expect(baseCss).toContain('.soom-theme-toggle:focus-visible');
      expect(baseCss).toContain('.soom-watermark:focus-visible');
      expect(baseCss).toContain('#soom-scrubber:focus-visible');
      // Outline is the accent token + 2px offset, per the visual identity contract.
      expect(baseCss).toMatch(/outline:\s*2px\s+solid\s+var\(--soom-accent\)/);
      expect(baseCss).toContain('outline-offset: 2px');
    });

    it('base CSS: defines the help modal styling (overlay, card, kbd entries)', async () => {
      const { baseCss } = await import('../../src/themes/base.js');
      expect(baseCss).toContain('.soom-help-modal');
      expect(baseCss).toContain('.soom-help-modal.soom-help-open');
      expect(baseCss).toContain('.soom-help-modal-card');
      expect(baseCss).toContain('.soom-help-modal-list kbd');
      expect(baseCss).toContain('.soom-help-modal-close');
    });

    it('buildControlsHtml: emits a help button with the (?) shortcut hint', () => {
      const html = buildControlsHtml();
      const btn = html.match(/<button[^>]*id="soom-help"[^>]*>/);
      expect(btn).not.toBeNull();
      expect(btn![0]).toContain('aria-label="Keyboard shortcuts"');
      expect(btn![0]).toContain('title="Keyboard shortcuts (?)"');
    });

    it('buildControlsHtml: emits a hidden help modal as a labelled aria-modal dialog', () => {
      const html = buildControlsHtml();
      expect(html).toContain('id="soom-help-modal"');
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="soom-help-title"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('id="soom-help-close"');
      // Each documented shortcut is present in the kbd list.
      expect(html).toContain('<kbd>Space</kbd>');
      expect(html).toContain('<kbd>F</kbd>');
      expect(html).toContain('<kbd>?</kbd>');
      expect(html).toContain('<kbd>Esc</kbd>');
    });

    it('buildControlsScript: ? toggles the help modal; Esc dismisses while open', () => {
      const script = buildControlsScript();
      expect(script).toContain("e.key === '?'");
      expect(script).toContain("e.code === 'Escape'");
      expect(script).toContain('soom-help-open');
      expect(script).toContain('aria-hidden');
    });

    it('buildControlsScript: defines a focus trap and restores focus to the invoker on close', () => {
      const script = buildControlsScript();
      // Focus trap reacts to Tab keys in the modal's keydown listener.
      expect(script).toContain("'Tab'");
      expect(script).toContain('querySelectorAll');
      expect(script).toContain('shiftKey');
      // Restoration of pre-open focus.
      expect(script).toContain('helpInvoker');
      expect(script).toContain('helpInvoker.focus()');
    });

    it('buildControlsScript: backdrop click on the modal closes it', () => {
      const script = buildControlsScript();
      // Outer-target check is the conventional backdrop-vs-card disambiguator.
      expect(script).toContain('e.target === helpModal');
    });

    it('buildControlsScript: swallows other shortcuts while the modal is open', () => {
      const script = buildControlsScript();
      expect(script).toContain('isHelpOpen()');
      // The early-return after Esc/? handling keeps Space/Arrow/F from firing.
      expect(script).toContain('if (isHelpOpen()) return');
    });
  });

  it('buildControlsHtml: loop button defaults to OFF (no soom-ctrl-active class, aria-pressed="false")', () => {
    const html = buildControlsHtml();
    const loopBtn = html.match(/<button[^>]*id="soom-loop"[^>]*>/);
    expect(loopBtn).not.toBeNull();
    expect(loopBtn![0]).not.toContain('soom-ctrl-active');
    expect(loopBtn![0]).toContain('aria-pressed="false"');
  });

  it('buildControlsScript: hydrates loopEnabled from localStorage "soom-loop"', () => {
    const script = buildControlsScript();
    expect(script).toContain("localStorage.getItem('soom-loop')");
    // Mirrors the soom-theme persistence pattern (string '1' = on, anything else = off)
    expect(script).toContain("=== '1'");
  });

  it('buildControlsScript: persists loop toggle to localStorage on click', () => {
    const script = buildControlsScript();
    expect(script).toContain("localStorage.setItem('soom-loop'");
  });

  it('buildControlsScript: speed cycles through 0.5/1/2/4', () => {
    const script = buildControlsScript();
    expect(script).toContain('0.5');
    expect(script).toContain('[0.5, 1, 2, 4]');
  });

  it('buildControlsScript: fullscreen uses Fullscreen API', () => {
    const script = buildControlsScript();
    expect(script).toContain('requestFullscreen');
    expect(script).toContain('exitFullscreen');
    expect(script).toContain('fullscreenchange');
  });

  it('base CSS: control bar touch targets are ≥44px', async () => {
    const { baseCss } = await import('../../src/themes/base.js');
    expect(baseCss).toContain('min-width: 44px');
    expect(baseCss).toContain('min-height: 44px');
  });

  it('base CSS: control bar has backdrop-filter blur', async () => {
    const { baseCss } = await import('../../src/themes/base.js');
    expect(baseCss).toContain('backdrop-filter: blur(8px)');
  });

  it('dark theme: defines --soom-controls-bg and --soom-controls-hover', async () => {
    const { darkTheme } = await import('../../src/themes/dark.js');
    expect(darkTheme.css).toContain('--soom-controls-bg');
    expect(darkTheme.css).toContain('--soom-controls-hover');
  });

  it('light theme: defines --soom-controls-bg and --soom-controls-hover', async () => {
    const { lightTheme } = await import('../../src/themes/light.js');
    expect(lightTheme.css).toContain('--soom-controls-bg');
    expect(lightTheme.css).toContain('--soom-controls-hover');
  });
});

describe('Annotation panel a11y', () => {
  const animationData = {
    sceneJson: '{"version":1,"diagramType":"flowchart","elements":{"nodes":{},"edges":{}},"steps":[],"timing":{"idleGap":500,"endHold":1000,"interStepGap":399,"loopDelay":3000}}',
    runtimeBundle: '/* runtime */',
  };

  it('annotation panel is rendered as an aria-live="polite" region with aria-atomic="true"', async () => {
    const html = await renderHtml('<svg></svg>', 'dark', animationData);
    expect(html).toContain(
      '<div id="soom-annotations" aria-live="polite" aria-atomic="true">'
    );
  });

  it('annotation panel is not emitted in static (no animation) output', async () => {
    const html = await renderHtml('<svg></svg>', 'dark');
    expect(html).not.toContain('id="soom-annotations"');
  });

  it('panel CSS no longer ships display:none — the runtime drives visibility via opacity', async () => {
    const { baseCss } = await import('../../src/themes/base.js');
    const block = baseCss.match(/#soom-annotations\s*\{[^}]*\}/);
    expect(block).not.toBeNull();
    expect(block![0]).not.toContain('display: none');
    expect(block![0]).toContain('opacity: 0');
  });
});

describe('Animation UX fixes', () => {
  it('fix1: base CSS adds padding-bottom to clear fixed control bar', async () => {
    const { baseCss } = await import('../../src/themes/base.js');
    expect(baseCss).toContain('padding-bottom');
    expect(baseCss).toContain('64px');
  });

  it('fix2: base CSS transitions watermark bottom on soom-controls-hidden', async () => {
    const { baseCss } = await import('../../src/themes/base.js');
    expect(baseCss).toContain('soom-controls-hidden');
    expect(baseCss).toContain('.soom-controls-hidden .soom-watermark');
    expect(baseCss).toContain('.soom-controls-hidden #soom-annotations');
    expect(baseCss).toContain('transition: bottom');
  });

  it('fix2: controls script toggles soom-controls-hidden on body', () => {
    const { buildControlsScript } = require('../../src/output/controls.js');
    const script = buildControlsScript();
    expect(script).toContain('soom-controls-hidden');
    expect(script).toContain('document.body.classList');
  });

  it('fix3: base CSS defines soom-seek-flash keyframes and soom-seeking class', async () => {
    const { baseCss } = await import('../../src/themes/base.js');
    expect(baseCss).toContain('soom-seek-flash');
    expect(baseCss).toContain('soom-seeking');
  });

  it('fix3: controls script calls flashSeek on step changes', () => {
    const { buildControlsScript } = require('../../src/output/controls.js');
    const script = buildControlsScript();
    expect(script).toContain('flashSeek');
    expect(script).toContain('soom-seeking');
  });

  it('fix4: controls script sets api.timeline.onComplete for loop-end sync', () => {
    const { buildControlsScript } = require('../../src/output/controls.js');
    const script = buildControlsScript();
    expect(script).toContain('api.timeline.onComplete');
    expect(script).toContain('!api.timeline.loop');
  });

  it('fix5: controls script guards against totalSteps === 0', () => {
    const { buildControlsScript } = require('../../src/output/controls.js');
    const script = buildControlsScript();
    expect(script).toContain('totalSteps === 0');
    expect(script).toContain('scrubber.disabled = true');
    expect(script).toContain('btnStepBack.disabled = true');
    expect(script).toContain('btnStepFwd.disabled = true');
  });
});
