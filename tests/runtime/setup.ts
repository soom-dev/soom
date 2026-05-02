import * as anime from 'animejs';
import { JSDOM } from 'jsdom';

/**
 * Test harness for src/runtime/* modules.
 *
 * The runtime imports from `./_anime.js`, which reads from `globalThis.anime`.
 * This shim populates that global so the modules behave as they would in a
 * browser with the UMD bundle loaded. Also boots a jsdom window so SVG queries
 * resolve against a real DOM.
 *
 * Call `setupRuntimeEnv(htmlBody?)` from each test's `beforeEach` so each test
 * gets a fresh DOM.
 */

interface HarnessGlobals {
  anime?: typeof anime;
  window?: Window;
  document?: Document;
  HTMLElement?: typeof HTMLElement;
  Element?: typeof Element;
  Node?: typeof Node;
  CSS?: typeof CSS;
  getComputedStyle?: typeof getComputedStyle;
  requestAnimationFrame?: typeof requestAnimationFrame;
  cancelAnimationFrame?: typeof cancelAnimationFrame;
  navigator?: Navigator;
  ResizeObserver?: typeof ResizeObserver;
}

class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const g = globalThis as unknown as HarnessGlobals;

export function setupRuntimeEnv(htmlBody = ''): { dom: JSDOM; window: Window } {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${htmlBody}</body></html>`);
  const w = dom.window as unknown as Window;
  g.window = w;
  g.document = w.document;
  g.HTMLElement = w.HTMLElement;
  g.Element = w.Element;
  g.Node = w.Node;
  g.navigator = w.navigator;
  if ('CSS' in w) g.CSS = (w as unknown as { CSS: typeof CSS }).CSS;
  // anime.js calls getComputedStyle / rAF directly on the global — bind to
  // jsdom or fall back to setTimeout/clearTimeout.
  g.getComputedStyle = w.getComputedStyle.bind(w);
  type AfFn = (cb: FrameRequestCallback) => number;
  type CafFn = (id: number) => void;
  const fallbackRaf: AfFn = (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
  const fallbackCaf: CafFn = (id) => clearTimeout(id);
  g.requestAnimationFrame = (
    typeof w.requestAnimationFrame === 'function'
      ? w.requestAnimationFrame.bind(w)
      : fallbackRaf
  ) as typeof requestAnimationFrame;
  g.cancelAnimationFrame = (
    typeof w.cancelAnimationFrame === 'function'
      ? w.cancelAnimationFrame.bind(w)
      : fallbackCaf
  ) as typeof cancelAnimationFrame;
  g.anime = anime;
  // jsdom doesn't ship ResizeObserver; anime.js text.splitText needs it.
  g.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  // jsdom doesn't ship FontFaceSet; anime.js text.splitText reads doc.fonts.
  if (!('fonts' in w.document)) {
    Object.defineProperty(w.document, 'fonts', {
      value: { status: 'loaded', ready: Promise.resolve() },
      configurable: true,
    });
  }
  return { dom, window: w };
}
