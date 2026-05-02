import { defineConfig } from '@playwright/test';

// Chromium is pinned via the exact `playwright` + `@playwright/test` versions in
// package.json (1.59.1). Each Playwright release bundles one Chromium build, so
// matching the package version pins the browser revision used for screenshots.
//
// `maxDiffPixelRatio: 0.02` (raised from 0.01 in R4) covers small fade-timing
// drift between the v1 codegen runtime and the v2 anime.js-native runtime —
// e.g. when `seek` lands the playhead between the per-step active fade-in and
// the post-step completed fade-out, the two runtimes settle on subtly
// different opacity values for the just-activated nodes. The R-plan risk
// register pre-authorized this mitigation; R7 is the place to retune the
// runtime to land back at ≤ 1%.
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
