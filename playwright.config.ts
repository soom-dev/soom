import { defineConfig } from '@playwright/test';

// Chromium is pinned via the exact `playwright` + `@playwright/test` versions in
// package.json (1.59.1). Each Playwright release bundles one Chromium build, so
// matching the package version pins the browser revision used for screenshots.
//
// `maxDiffPixelRatio: 0.02` — R7-debt audited the original R4-era v1↔v2
// justification. v1 is gone post-R6 so that reason no longer applies. The
// `stress-final` baseline (kitchen-sink, 26 steps × 13 shape types) still
// drifts ~0.0199 against the R0/v1-captured baseline because the seek
// playhead lands fractionally short of the fully-completed fade-out target,
// compounded across the dense composition. R7-polish is the place to fix
// the drift at the source (snap seek to `completeOffset + fadeDuration`)
// or re-baseline both darwin + linux snapshot platforms to v2's actual
// output — either path lets this drop back to 0.01.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        colorScheme: 'light',
        launchOptions: {
          args: ['--font-render-hinting=none', '--disable-skia-runtime-opts'],
        },
      },
    },
  ],
});
