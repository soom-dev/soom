import { defineConfig } from '@playwright/test';

// Chromium is pinned via the exact `playwright` + `@playwright/test` versions in
// package.json (1.59.1). Each Playwright release bundles one Chromium build, so
// matching the package version pins the browser revision used for screenshots.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
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
