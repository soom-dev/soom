/**
 * User-preference detection that the runtime consults at boot.
 *
 * `prefers-reduced-motion` is the WCAG/OS-level signal users emit when
 * vestibular-disorder triggers (or simply battery/perf reasons) make
 * "decorative" motion harmful. The runtime collapses step durations to
 * `REDUCED_MOTION_DURATION` and skips the marching-line + focus loops
 * + flow particles when this returns `true`. Autoplay stays off either way.
 */

/** Per-segment duration (ms) used in place of normal step durations under reduced motion. */
export const REDUCED_MOTION_DURATION = 150;

export function prefersReducedMotion(): boolean {
  const win = (globalThis as { window?: Window }).window;
  if (!win || typeof win.matchMedia !== 'function') return false;
  try {
    return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
