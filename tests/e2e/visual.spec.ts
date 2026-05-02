import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// ── Tier 3: Visual identity gate — pixel baselines for canonical diagrams ──
//
// Captures three screenshots per diagram (idle, mid-flow, final) so any
// subsequent runtime refactor PR (R1+) shows visual diffs in CI when present.
// Tolerance is the suite-wide `maxDiffPixelRatio: 0.01` from playwright.config.ts.
//
// Parameterized on `HANSOOM_RUNTIME` (default `v1`): the same pixel baselines
// (captured under R0/v1) gate both runtimes. Under R4 the CI runs this spec
// twice, once per runtime; locally `HANSOOM_RUNTIME=v2 bun run test:e2e`
// forces the v2 path. The output HTML path is suffixed with the runtime so
// successive invocations never clobber each other's artifacts.
//
// Diagrams chosen to span complexity:
//   simple  — flow-simple.mmd      (3 nodes, 2 edges; basic node/edge animation)
//   medium  — flow-ecommerce.mmd   (subgraphs, parallel flows, edge labels)
//   stress  — kitchen-sink.mmd     (all 13 shapes, nested subgraphs, dense edges)
//
// Sequence diagrams are deliberately excluded — sequence support isn't on main yet.

const RUNTIME = (process.env.HANSOOM_RUNTIME ?? 'v1') as 'v1' | 'v2';
if (RUNTIME !== 'v1' && RUNTIME !== 'v2') {
  throw new Error(
    `HANSOOM_RUNTIME must be 'v1' or 'v2' (got ${JSON.stringify(process.env.HANSOOM_RUNTIME)})`
  );
}

const DIAGRAMS = [
  { id: 'simple', mmd: 'examples/basic/flow-simple.mmd' },
  { id: 'medium', mmd: 'examples/microservices/flow-ecommerce.mmd' },
  { id: 'stress', mmd: 'examples/stress/kitchen-sink.mmd' },
];

for (const { id, mmd } of DIAGRAMS) {
  const html = `/tmp/e2e-visual-${id}-${RUNTIME}.html`;

  test.describe(`visual: ${id} [${RUNTIME}]`, () => {
    test.beforeAll(() => {
      execSync(`bun run src/cli.ts render ${mmd} -o ${html}`, {
        stdio: 'pipe',
        env: { ...process.env, HANSOOM_RUNTIME: RUNTIME },
      });
      if (!existsSync(html)) throw new Error(`render failed: ${html} not found`);
    });

    test.beforeEach(async ({ page }) => {
      await page.goto(`file://${html}`);
      // Boot delays a 500ms timeline.play(); pause as soon as the API is live
      // so the step-0 baseline is stationary.
      await page.waitForFunction(
        () => typeof (window as any).soomAnimation !== 'undefined',
        { timeout: 10_000 },
      );
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForFunction(
        () => {
          const api = (window as any).soomAnimation;
          return api.totalSteps === 0 || api.totalSteps > 0;
        },
        { timeout: 5_000 },
      );
    });

    test('step 0 — idle baseline', async ({ page }) => {
      await page.evaluate(() => (window as any).soomAnimation.goToStep(0));
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`${id}-step-0.png`);
    });

    test('mid-flow baseline', async ({ page }) => {
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(Math.floor(api.totalSteps / 2));
      });
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`${id}-mid.png`);
    });

    test('final step baseline', async ({ page }) => {
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(api.totalSteps);
      });
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`${id}-final.png`);
    });
  });
}
